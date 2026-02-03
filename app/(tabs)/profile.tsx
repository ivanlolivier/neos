import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import { useAttendanceStreak } from "@/hooks/useTrainings";
import { useAchievements } from "@/hooks/useAchievements";
import Colors from "@/constants/Colors";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { profile, signOut, isCoach } = useAuth();
  const { data: streak } = useAttendanceStreak();
  const { unlockedCount, totalCount } = useAchievements();

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que querés cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const getRoleBadge = () => {
    if (profile?.role === "admin") return "Admin";
    if (profile?.role === "coach") return "Coach";
    return "Miembro";
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <FontAwesome name="user" size={48} color={colors.textSecondary} />
          )}
        </View>

        <Text style={[styles.name, { color: colors.text }]}>
          {profile?.full_name ?? "Runner"}
        </Text>

        {streak != null && streak > 0 && (
          <View
            style={[
              styles.streakBadge,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakText, { color: colors.text }]}>
              {streak} {streak === 1 ? "día de racha" : "días de racha"}
            </Text>
          </View>
        )}

        <View style={styles.badgesRow}>
          <View style={[styles.roleBadge, { backgroundColor: colors.tint }]}>
            <Text style={styles.roleBadgeText}>{getRoleBadge()}</Text>
          </View>

          {profile?.date_of_birth && (() => {
            const birth = new Date(profile.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return (
              <View style={[styles.infoBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.infoBadgeText, { color: colors.text }]}>{age} años</Text>
              </View>
            );
          })()}

          {profile?.running_experience && (
            <View style={[styles.infoBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.infoBadgeText, { color: colors.text }]}>{profile.running_experience}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Configuración
        </Text>

        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/edit-profile")}
          >
            <View style={styles.menuItemLeft}>
              <FontAwesome name="user-o" size={20} color={colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Editar perfil
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/notifications")}
          >
            <View style={styles.menuItemLeft}>
              <FontAwesome name="bell-o" size={20} color={colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Notificaciones
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Entrenamiento
        </Text>

        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/zones")}
          >
            <View style={styles.menuItemLeft}>
              <FontAwesome name="tachometer" size={20} color={colors.tint} />
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Mis Zonas
                </Text>
                <Text
                  style={[styles.menuItemSubtext, { color: colors.textSecondary }]}
                >
                  {profile?.vam
                    ? `VAM: ${Math.floor(profile.vam / 60)}:${(profile.vam % 60).toString().padStart(2, "0")} min/km`
                    : "Configurar VAM"}
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/personal-records")}
          >
            <View style={styles.menuItemLeft}>
              <FontAwesome name="trophy" size={20} color={colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Mis Records
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/achievements")}
          >
            <View style={styles.menuItemLeft}>
              <FontAwesome name="star" size={20} color={colors.tint} />
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Mis Logros
                </Text>
                <Text
                  style={[styles.menuItemSubtext, { color: colors.textSecondary }]}
                >
                  {unlockedCount} / {totalCount} desbloqueados
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {(profile?.resting_heart_rate || profile?.max_heart_rate) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <FontAwesome name="heartbeat" size={20} color="#ef4444" />
                  <View>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      Frecuencia Cardíaca
                    </Text>
                    <Text
                      style={[styles.menuItemSubtext, { color: colors.textSecondary }]}
                    >
                      {[
                        profile.resting_heart_rate && `Reposo: ${profile.resting_heart_rate} bpm`,
                        profile.max_heart_rate && `Máx: ${profile.max_heart_rate} bpm`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Integraciones
        </Text>

        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <FontAwesome name="heartbeat" size={20} color="#4caf50" />
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Garmin Connect
                </Text>
                <Text
                  style={[styles.menuItemSubtext, { color: colors.textSecondary }]}
                >
                  {profile?.garmin_access_token
                    ? "Conectado"
                    : "No conectado"}
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <FontAwesome name="apple" size={20} color="#4caf50" />
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Apple Health
                </Text>
                <Text
                  style={[styles.menuItemSubtext, { color: colors.textSecondary }]}
                >
                  {profile?.healthkit_enabled ? "Activado" : "No activado"}
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isCoach && (
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Coach
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome name="users" size={20} color={colors.tint} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Ver miembros
                </Text>
              </View>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome name="bar-chart" size={20} color={colors.tint} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Estadísticas del grupo
                </Text>
              </View>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: colors.card }]}
        onPress={handleSignOut}
      >
        <FontAwesome name="sign-out" size={20} color={colors.error} />
        <Text style={[styles.signOutText, { color: colors.error }]}>
          Cerrar sesión
        </Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        Neos v1.0.0
      </Text>
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
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
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
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  infoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 48,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
  },
});
