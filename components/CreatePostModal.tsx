import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import Colors from "@/constants/Colors";
import { hapticLight } from "@/lib/haptics";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; photoUris: string[] }) => void;
  isSubmitting: boolean;
  colors: typeof Colors.dark;
};

export default function CreatePostModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  colors,
}: Props) {
  const [content, setContent] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const canPublish = content.trim().length > 0 || photoUris.length > 0;

  const handlePickImages = async () => {
    hapticLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4 - photoUris.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setPhotoUris((prev) => [...prev, ...newUris].slice(0, 4));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = () => {
    if (!canPublish || isSubmitting) return;
    onSubmit({ content: content.trim(), photoUris });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setContent("");
    setPhotoUris([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Nuevo post
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <FontAwesome
                name="times"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Text input */}
          <ScrollView style={styles.scrollArea}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Qué estás pensando?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />

            {/* Photo thumbnails */}
            {photoUris.length > 0 && (
              <View style={styles.photoRow}>
                {photoUris.map((uri, index) => (
                  <View key={uri} style={styles.thumbnailContainer}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}
                      disabled={isSubmitting}
                    >
                      <FontAwesome name="times-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Bottom actions */}
          <View style={styles.actions}>
            {photoUris.length < 4 && (
              <TouchableOpacity
                style={[
                  styles.imageButton,
                  { borderColor: colors.border },
                ]}
                onPress={handlePickImages}
                disabled={isSubmitting}
              >
                <FontAwesome name="image" size={18} color={colors.tint} />
                <Text style={[styles.imageButtonText, { color: colors.tint }]}>
                  Imagen
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.publishButton,
                { backgroundColor: colors.tint },
                (!canPublish || isSubmitting) && styles.publishButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={!canPublish || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.publishButtonText}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollArea: {
    flexGrow: 0,
  },
  textInput: {
    minHeight: 100,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
    textAlignVertical: "top",
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  thumbnailContainer: {
    position: "relative",
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  publishButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
