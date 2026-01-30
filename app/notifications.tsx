import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/lib/toast";

type NotificationPreferences = {
  reminders: boolean;
  news: boolean;
  weekendPlan: boolean;
  streakReminder: boolean;
};

const defaultPreferences: NotificationPreferences = {
  reminders: true,
  news: true,
  weekendPlan: true,
  streakReminder: true,
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    (profile?.notification_preferences as NotificationPreferences) ??
      defaultPreferences
  );
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (!Device.isDevice) {
      setPermissionStatus("simulator");
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    if (status === "granted") {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
      } catch {
        // Project ID not configured, skip token retrieval
      }
    }
  };

  const requestPermissions = async () => {
    if (!Device.isDevice) {
      showError("Las notificaciones push solo funcionan en dispositivos físicos");
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);

    if (status === "granted") {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);

        // Save token to database
        if (user) {
          await supabase.from("push_tokens").upsert(
            {
              user_id: user.id,
              expo_push_token: token.data,
              platform: Platform.OS as "ios" | "android",
            },
            { onConflict: "user_id,expo_push_token" }
          );
        }
      } catch {
        // Project ID not configured, skip token save
      }

      showSuccess("Notificaciones activadas");
    } else {
      showError("Podés activar las notificaciones desde la configuración de tu dispositivo");
    }
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: newPreferences })
        .eq("id", user!.id);

      if (error) throw error;
      await refreshProfile();
    } catch (error: any) {
      // Revert on error
      setPreferences(preferences);
      showError("No se pudo guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: "reminders" as const,
      title: "Recordatorios de entrenamiento",
      description: "Recibí un aviso antes de cada entrenamiento programado",
      icon: "bell" as const,
    },
    {
      key: "weekendPlan" as const,
      title: "Plan de fin de semana",
      description: "Notificación cuando tu coach publique el plan del finde",
      icon: "calendar" as const,
    },
    {
      key: "streakReminder" as const,
      title: "Racha en riesgo",
      description: "Aviso si no confirmaste asistencia y tu racha está en juego",
      icon: "fire" as const,
    },
    {
      key: "news" as const,
      title: "Novedades del club",
      description: "Anuncios, eventos especiales y noticias importantes",
      icon: "bullhorn" as const,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Notificaciones
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Permission Status */}
      {permissionStatus !== "granted" && (
        <View
          style={[
            styles.permissionCard,
            { backgroundColor: colors.card, borderColor: colors.tint },
          ]}
        >
          <View style={styles.permissionContent}>
            <FontAwesome
              name="bell-slash"
              size={24}
              color={colors.textSecondary}
            />
            <View style={styles.permissionText}>
              <Text style={[styles.permissionTitle, { color: colors.text }]}>
                {permissionStatus === "simulator"
                  ? "Simulador detectado"
                  : "Notificaciones desactivadas"}
              </Text>
              <Text
                style={[
                  styles.permissionDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {permissionStatus === "simulator"
                  ? "Las notificaciones push solo funcionan en dispositivos físicos"
                  : "Activá las notificaciones para no perderte ningún entrenamiento"}
              </Text>
            </View>
          </View>
          {permissionStatus !== "simulator" && (
            <TouchableOpacity
              style={[styles.enableButton, { backgroundColor: colors.tint }]}
              onPress={requestPermissions}
            >
              <Text style={styles.enableButtonText}>Activar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notification Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Tipos de notificaciones
        </Text>

        <View style={[styles.optionsCard, { backgroundColor: colors.card }]}>
          {notificationOptions.map((option, index) => (
            <View key={option.key}>
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <FontAwesome
                      name={option.icon}
                      size={18}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences[option.key]}
                  onValueChange={(value) => updatePreference(option.key, value)}
                  trackColor={{
                    false: colors.border,
                    true: colors.tint,
                  }}
                  thumbColor="#fff"
                  disabled={isSaving || permissionStatus !== "granted"}
                />
              </View>
              {index < notificationOptions.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <FontAwesome name="info-circle" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Podés cambiar estos ajustes en cualquier momento. Las notificaciones
          se envían según tu zona horaria.
        </Text>
      </View>

      {isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.savingText, { color: colors.textSecondary }]}>
            Guardando...
          </Text>
        </View>
      )}
    </ScrollView>
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
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 36,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  permissionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
  },
  enableButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  enableButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  optionsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  savingText: {
    fontSize: 14,
  },
});
