import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import { useUpdateProfile, useUploadAvatar } from "@/hooks/useProfile";
import Colors from "@/constants/Colors";
import { showSuccess, showError } from "@/lib/toast";

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const isSaving = updateProfile.isPending || uploadAvatar.isPending;

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "El nombre es requerido");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });

      showSuccess("Perfil actualizado");
      router.back();
    } catch (error: any) {
      showError(error.message || "No se pudo actualizar el perfil");
    }
  };

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      showError("Necesitamos acceso a tu galería para cambiar la foto de perfil");
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const newUrl = await uploadAvatar.mutateAsync(result.assets[0].uri);
        setLocalAvatarUrl(newUrl);
        showSuccess("Foto actualizada");
      } catch (error: any) {
        showError(error.message || "No se pudo subir la imagen");
      }
    }
  };

  const handleTakePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      showError("Necesitamos acceso a tu cámara para tomar una foto");
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const newUrl = await uploadAvatar.mutateAsync(result.assets[0].uri);
        setLocalAvatarUrl(newUrl);
        showSuccess("Foto actualizada");
      } catch (error: any) {
        showError(error.message || "No se pudo subir la imagen");
      }
    }
  };

  const showImageOptions = () => {
    Alert.alert("Cambiar foto", "Elegí una opción", [
      { text: "Tomar foto", onPress: handleTakePhoto },
      { text: "Elegir de galería", onPress: handlePickImage },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="times" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Editar perfil
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.tint },
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarSection}
          onPress={showImageOptions}
          disabled={uploadAvatar.isPending}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {uploadAvatar.isPending ? (
              <ActivityIndicator size="large" color={colors.tint} />
            ) : localAvatarUrl || profile?.avatar_url ? (
              <Image
                source={{ uri: localAvatarUrl || profile?.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <FontAwesome name="user" size={50} color={colors.textSecondary} />
            )}
          </View>
          <Text style={[styles.changePhotoText, { color: colors.tint }]}>
            Cambiar foto
          </Text>
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nombre completo
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Teléfono (opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+54 11 1234-5678"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Email
            </Text>
            <View
              style={[
                styles.input,
                styles.inputDisabled,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: colors.textSecondary }}>
                {user?.email ?? ""}
              </Text>
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              El email no se puede cambiar
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatar: {
    width: 100,
    height: 100,
  },
  changePhotoText: {
    fontSize: 16,
    fontWeight: "500",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});
