import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const PAGE_SIZE = 20;

export type PostWithDetails = {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  photos: {
    id: string;
    photo_url: string;
    order: number;
  }[];
  likes_count: number;
  is_liked: boolean;
};

type PostsPage = {
  posts: PostWithDetails[];
  nextCursor: number | null;
};

export function usePosts() {
  const { user } = useAuth();

  return useInfiniteQuery<PostsPage>({
    queryKey: ["posts"],
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id, user_id, content, created_at,
          profiles!posts_user_id_fkey(id, full_name, avatar_url),
          post_photos(id, photo_url, order),
          post_likes(user_id)
        `
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const posts: PostWithDetails[] = (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        profile: row.profiles,
        photos: (row.post_photos ?? []).sort(
          (a: any, b: any) => a.order - b.order
        ),
        likes_count: row.post_likes?.length ?? 0,
        is_liked: row.post_likes?.some(
          (l: any) => l.user_id === user?.id
        ) ?? false,
      }));

      return {
        posts,
        nextCursor: posts.length === PAGE_SIZE ? (pageParam as number) + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      photoUris,
    }: {
      content: string;
      photoUris: string[];
    }) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Insert post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, content: content.trim() || null })
        .select()
        .single();

      if (postError) throw postError;

      // 2. Upload photos in parallel
      if (photoUris.length > 0) {
        const uploadResults = await Promise.all(
          photoUris.map(async (uri, index) => {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: "base64",
            });
            const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
            const fileName = `${user.id}/${post.id}-${index}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("post-photos")
              .upload(fileName, decode(base64), {
                contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
              });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("post-photos")
              .getPublicUrl(fileName);

            return {
              post_id: post.id,
              photo_url: urlData.publicUrl,
              order: index,
            };
          })
        );

        // 3. Insert photo records
        const { error: photosError } = await supabase
          .from("post_photos")
          .insert(uploadResults);

        if (photosError) throw photosError;
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      photoUrls,
    }: {
      postId: string;
      photoUrls: string[];
    }) => {
      // Best-effort remove photos from storage
      if (photoUrls.length > 0) {
        const paths = photoUrls
          .map((url) => {
            const match = url.match(/post-photos\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (paths.length > 0) {
          await supabase.storage.from("post-photos").remove(paths).catch(() => {});
        }
      }

      // Delete post (cascade deletes photos + likes records)
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<InfiniteData<PostsPage>>(["posts"]);

      // Optimistically update
      queryClient.setQueryData<InfiniteData<PostsPage>>(["posts"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    is_liked: !isLiked,
                    likes_count: post.likes_count + (isLiked ? -1 : 1),
                  }
                : post
            ),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["posts"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
