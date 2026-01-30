import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import {
  usePosts,
  useCreatePost,
  useDeletePost,
  useToggleLike,
  type PostWithDetails,
} from "@/hooks/usePosts";
import { showSuccess, showError } from "@/lib/toast";
import { hapticSelection, hapticWarning, hapticLight } from "@/lib/haptics";
import CreatePostModal from "@/components/CreatePostModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function timeAgo(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = differenceInHours(now, date);
  if (hours < 24) return `Hace ${hours}h`;
  const days = differenceInDays(now, date);
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return `Hace ${Math.floor(days / 30)} meses`;
}

// --- Photo Grid ---
function PhotoGrid({
  photos,
  onPress,
}: {
  photos: PostWithDetails["photos"];
  onPress: (index: number) => void;
}) {
  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.9}>
        <Image
          source={{ uri: photos[0].photo_url }}
          style={styles.photoSingle}
        />
      </TouchableOpacity>
    );
  }

  if (photos.length === 2) {
    return (
      <View style={styles.photoRow}>
        {photos.map((p, i) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => onPress(i)}
            activeOpacity={0.9}
            style={styles.photoHalf}
          >
            <Image source={{ uri: p.photo_url }} style={styles.photoHalfImg} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3 or 4 photos: 2x2 grid
  return (
    <View style={styles.photoGrid}>
      {photos.slice(0, 4).map((p, i) => (
        <TouchableOpacity
          key={p.id}
          onPress={() => onPress(i)}
          activeOpacity={0.9}
          style={styles.photoGridItem}
        >
          <Image source={{ uri: p.photo_url }} style={styles.photoGridImg} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- Photo Viewer Modal ---
function PhotoViewer({
  visible,
  photos,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  photos: PostWithDetails["photos"];
  initialIndex: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.viewerOverlay}>
        <TouchableOpacity style={styles.viewerClose} onPress={onClose}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.photo_url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// --- Post Card ---
function PostCard({
  post,
  isOwn,
  colors,
  onLike,
  onDelete,
  onPhotoPress,
}: {
  post: PostWithDetails;
  isOwn: boolean;
  colors: typeof Colors.dark;
  onLike: () => void;
  onDelete: () => void;
  onPhotoPress: (index: number) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header: avatar + name + time */}
      <View style={styles.cardHeader}>
        {post.profile.avatar_url ? (
          <Image
            source={{ uri: post.profile.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <FontAwesome name="user" size={16} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.cardHeaderText}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {post.profile.full_name}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {timeAgo(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[styles.postContent, { color: colors.text }]}>
          {post.content}
        </Text>
      ) : null}

      {/* Photos */}
      {post.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <PhotoGrid photos={post.photos} onPress={onPhotoPress} />
        </View>
      )}

      {/* Actions: like + delete */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.likeButton} onPress={onLike}>
          <FontAwesome
            name={post.is_liked ? "heart" : "heart-o"}
            size={18}
            color={post.is_liked ? "#ef4444" : colors.textSecondary}
          />
          {post.likes_count > 0 && (
            <Text
              style={[
                styles.likeCount,
                { color: post.is_liked ? "#ef4444" : colors.textSecondary },
              ]}
            >
              {post.likes_count}
            </Text>
          )}
        </TouchableOpacity>

        {isOwn && (
          <TouchableOpacity onPress={onDelete}>
            <FontAwesome name="trash-o" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isLoading } =
    usePosts();
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const toggleLike = useToggleLike();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<PostWithDetails["photos"]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  const handleCreatePost = useCallback(
    async ({ content, photoUris }: { content: string; photoUris: string[] }) => {
      try {
        await createPost.mutateAsync({ content, photoUris });
        setShowCreateModal(false);
        showSuccess("Post publicado");
      } catch {
        showError("No se pudo publicar el post");
      }
    },
    [createPost]
  );

  const handleDelete = useCallback(
    (post: PostWithDetails) => {
      hapticWarning();
      Alert.alert(
        "Eliminar post",
        "¿Estás seguro que querés eliminar este post?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePost.mutateAsync({
                  postId: post.id,
                  photoUrls: post.photos.map((p) => p.photo_url),
                });
                showSuccess("Post eliminado");
              } catch {
                showError("No se pudo eliminar el post");
              }
            },
          },
        ]
      );
    },
    [deletePost]
  );

  const handleLike = useCallback(
    (post: PostWithDetails) => {
      hapticSelection();
      toggleLike.mutate({ postId: post.id, isLiked: post.is_liked });
    },
    [toggleLike]
  );

  const handlePhotoPress = useCallback(
    (photos: PostWithDetails["photos"], index: number) => {
      setViewerPhotos(photos);
      setViewerIndex(index);
      setShowViewer(true);
    },
    []
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostWithDetails }) => (
      <PostCard
        post={item}
        isOwn={item.user_id === user?.id}
        colors={colors}
        onLike={() => handleLike(item)}
        onDelete={() => handleDelete(item)}
        onPhotoPress={(index) => handlePhotoPress(item.photos, index)}
      />
    ),
    [user?.id, colors, handleLike, handleDelete, handlePhotoPress]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="comments-o" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hay publicaciones todavía
        </Text>
      </View>
    );
  }, [isLoading, colors]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  }, [isFetchingNextPage, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={allPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onRefresh={refetch}
        refreshing={false}
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => {
          hapticLight();
          setShowCreateModal(true);
        }}
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        isSubmitting={createPost.isPending}
        colors={colors}
      />

      {/* Photo Viewer */}
      <PhotoViewer
        visible={showViewer}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        onClose={() => setShowViewer(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  // Card
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderText: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 1,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  // Photos
  photosContainer: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoSingle: {
    width: "100%",
    height: 220,
    borderRadius: 10,
  },
  photoRow: {
    flexDirection: "row",
    gap: 4,
  },
  photoHalf: {
    flex: 1,
  },
  photoHalfImg: {
    width: "100%",
    height: 160,
    borderRadius: 10,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  photoGridItem: {
    width: "49%",
  },
  photoGridImg: {
    width: "100%",
    height: 120,
    borderRadius: 10,
  },
  // Actions
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  // Footer
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Photo Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
});
