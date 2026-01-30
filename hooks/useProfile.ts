import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Profile } from "@/types/database";

type UpdateProfileData = {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  vam?: number;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: profile, error } = await supabase
        .from("profiles")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      return profile as Profile;
    },
    onSuccess: async () => {
      // Refresh the profile in AuthProvider
      await refreshProfile();
      // Invalidate any profile-related queries
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!user) throw new Error("User not authenticated");

      // Read the file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });

      // Generate unique filename
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage using base64-arraybuffer decode
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile.mutateAsync({ avatar_url: urlData.publicUrl });

      return urlData.publicUrl;
    },
  });
}
