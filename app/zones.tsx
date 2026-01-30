import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import { useUpdateProfile } from "@/hooks/useProfile";
import Colors from "@/constants/Colors";
import { showSuccess, showError } from "@/lib/toast";

// Zone definitions based on coach's training plan
// %VAM values: percentage of VAM pace (higher % = faster)
// Pace multiplier: 100 / %VAM (e.g. 70% VAM → 100/70 = 1.43x slower)
const ZONES = [
  {
    shortName: "R1",
    name: "Recuperación Activa",
    description: "Muy Suave",
    rpe: "1-2",
    vamPercentMax: 70, // ≤70%
    paceMultiplier: 100 / 70, // slowest boundary
    color: "#22c55e",
  },
  {
    shortName: "R2",
    name: "Aeróbico Continuo",
    description: "Suave - Fácil",
    rpe: "3-4",
    vamPercentRange: [70, 75],
    paceMultiplierRange: [100 / 70, 100 / 75],
    color: "#84cc16",
  },
  {
    shortName: "R3",
    name: "Moderado",
    description: "Ligero cómodo",
    rpe: "5-6",
    vamPercentRange: [75, 80],
    paceMultiplierRange: [100 / 75, 100 / 80],
    color: "#eab308",
  },
  {
    shortName: "R4",
    name: "Ágil",
    description: "Duro Controlado",
    rpe: "7-8",
    vamPercentRange: [82, 88],
    paceMultiplierRange: [100 / 82, 100 / 88],
    color: "#f97316",
  },
  {
    shortName: "R5",
    name: "Exigente",
    description: "Respiración Agitada",
    rpe: "9",
    vamPercentRange: [90, 95],
    paceMultiplierRange: [100 / 90, 100 / 95],
    color: "#ef4444",
  },
  {
    shortName: "R6",
    name: "Muy Exigente",
    description: "Máximo esfuerzo",
    rpe: "10",
    vamPercentMin: 100, // ≥100%
    paceMultiplier: 100 / 100, // fastest boundary
    color: "#dc2626",
  },
];

// Parse pace string "4:30" to total seconds
function parsePaceToSeconds(pace: string): number | null {
  const parts = pace.split(":");
  if (parts.length !== 2) return null;

  const mins = parseInt(parts[0], 10);
  const secs = parseInt(parts[1], 10);

  if (isNaN(mins) || isNaN(secs) || secs >= 60) return null;

  return mins * 60 + secs;
}

// Format seconds to pace string "4:30"
function formatPace(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Calculate pace for a given multiplier percentage
// multiplier > 100 means slower (recovery)
// multiplier = 100 means at VAM pace
function calculateZonePace(vamSeconds: number, multiplierPercent: number): string {
  const paceSeconds = (vamSeconds * multiplierPercent) / 100;
  return formatPace(paceSeconds);
}

export default function ZonesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [vamInput, setVamInput] = useState(profile?.vam?.toString() ?? "");

  // VAM is stored as total seconds (e.g., 270 for 4:30)
  const vamSeconds = profile?.vam;
  const vamDisplay = vamSeconds ? formatPace(vamSeconds) : null;

  const handleSaveVam = async () => {
    const seconds = parsePaceToSeconds(vamInput);

    if (seconds === null) {
      Alert.alert("Error", "Ingresá el ritmo en formato min:seg (ej: 4:30)");
      return;
    }

    // Validate reasonable VAM range (between 3:00 and 8:00 min/km)
    if (seconds < 180 || seconds > 480) {
      Alert.alert("Error", "El VAM debe estar entre 3:00 y 8:00 min/km");
      return;
    }

    try {
      await updateProfile.mutateAsync({ vam: seconds });
      await refreshProfile();
      setIsEditing(false);
      showSuccess("VAM actualizado");
    } catch (error: any) {
      showError(error.message || "No se pudo guardar el VAM");
    }
  };

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
        <Text style={[styles.title, { color: colors.text }]}>Mis Zonas</Text>
        <View style={styles.placeholder} />
      </View>

      {/* VAM Input Section */}
      <View style={[styles.vamCard, { backgroundColor: colors.card }]}>
        <View style={styles.vamHeader}>
          <View>
            <Text style={[styles.vamLabel, { color: colors.textSecondary }]}>
              Tu VAM (Velocidad Aeróbica Máxima)
            </Text>
            <Text
              style={[styles.vamDescription, { color: colors.textSecondary }]}
            >
              Ritmo máximo sostenido durante 6 minutos
            </Text>
          </View>
          {!isEditing && (
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: colors.backgroundSecondary },
              ]}
              onPress={() => {
                setVamInput(vamDisplay ?? "");
                setIsEditing(true);
              }}
            >
              <FontAwesome name="pencil" size={14} color={colors.tint} />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.vamEditRow}>
            <TextInput
              style={[
                styles.vamInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={vamInput}
              onChangeText={setVamInput}
              placeholder="4:30"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
            <Text style={[styles.vamUnit, { color: colors.textSecondary }]}>
              min/km
            </Text>
            <TouchableOpacity
              style={[styles.saveVamButton, { backgroundColor: colors.tint }]}
              onPress={handleSaveVam}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="check" size={16} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.backgroundSecondary },
              ]}
              onPress={() => {
                setIsEditing(false);
                setVamInput(vamDisplay ?? "");
              }}
            >
              <FontAwesome name="times" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vamDisplay}>
            {vamDisplay ? (
              <>
                <Text style={[styles.vamValue, { color: colors.tint }]}>
                  {vamDisplay}
                </Text>
                <Text style={[styles.vamUnit, { color: colors.textSecondary }]}>
                  min/km
                </Text>
              </>
            ) : (
              <Text style={[styles.noVam, { color: colors.textSecondary }]}>
                No configurado - Tocá el lápiz para agregar tu VAM
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Zones Table */}
      {vamSeconds ? (
        <View style={styles.zonesSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Zonas y Ritmos de Entrenamiento
          </Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: colors.card }]}>
            <View style={styles.tableHeaderRow}>
              <Text
                style={[styles.headerCell, styles.zoneCell, { color: colors.text }]}
              >
                Zona
              </Text>
              <Text
                style={[
                  styles.headerCell,
                  styles.percentCell,
                  { color: colors.text },
                ]}
              >
                %VAM
              </Text>
              <Text
                style={[styles.headerCell, styles.rpeCell, { color: colors.text }]}
              >
                RPE
              </Text>
              <Text
                style={[styles.headerCell, styles.paceCell, { color: colors.text }]}
              >
                Ritmo
              </Text>
            </View>
          </View>

          {/* Table Body */}
          <View style={[styles.tableBody, { backgroundColor: colors.card }]}>
            {ZONES.map((zone, index) => {
              let paceDisplay: string;
              let percentDisplay: string;

              if (zone.paceMultiplierRange) {
                const paceSlow = calculateZonePace(
                  vamSeconds,
                  zone.paceMultiplierRange[0] * 100
                );
                const paceFast = calculateZonePace(
                  vamSeconds,
                  zone.paceMultiplierRange[1] * 100
                );
                paceDisplay = `${paceSlow} - ${paceFast}`;
                percentDisplay = `${zone.vamPercentRange![0]}-${zone.vamPercentRange![1]}%`;
              } else if (zone.vamPercentMax) {
                // R1: ≤70%
                paceDisplay = `≥ ${calculateZonePace(vamSeconds, zone.paceMultiplier! * 100)}`;
                percentDisplay = `≤${zone.vamPercentMax}%`;
              } else {
                // R6: ≥100%
                paceDisplay = `≤ ${calculateZonePace(vamSeconds, zone.paceMultiplier! * 100)}`;
                percentDisplay = `≥${zone.vamPercentMin}%`;
              }

              return (
                <View key={zone.shortName}>
                  <View style={styles.tableRow}>
                    <View style={[styles.zoneCell, styles.zoneCellContent]}>
                      <View
                        style={[
                          styles.zoneColorBar,
                          { backgroundColor: zone.color },
                        ]}
                      />
                      <View style={styles.zoneInfo}>
                        <Text style={[styles.zoneName, { color: colors.text }]}>
                          {zone.shortName}
                        </Text>
                        <Text
                          style={[
                            styles.zoneFullName,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {zone.name}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.cell,
                        styles.percentCell,
                        { color: colors.text },
                      ]}
                    >
                      {percentDisplay}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.rpeCell,
                        { color: colors.text },
                      ]}
                    >
                      {zone.rpe}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.paceCell,
                        { color: colors.tint },
                      ]}
                    >
                      {paceDisplay}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.zoneDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {zone.description}
                  </Text>
                  {index < ZONES.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <FontAwesome name="tachometer" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Configurá tu VAM
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            Ingresá tu ritmo de VAM para ver tus zonas de entrenamiento
            personalizadas.
          </Text>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <FontAwesome name="info-circle" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          El VAM se obtiene con un test de 6 minutos a máxima intensidad.
          Consultá con tu coach para realizarlo correctamente.
        </Text>
      </View>
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
  vamCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  vamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  vamLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  vamDescription: {
    fontSize: 12,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  vamDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  vamValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  vamUnit: {
    fontSize: 16,
  },
  noVam: {
    fontSize: 14,
    fontStyle: "italic",
  },
  vamEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vamInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    borderWidth: 1,
  },
  saveVamButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  zonesSection: {
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
  tableHeader: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    paddingBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableBody: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  zoneCell: {
    flex: 2,
  },
  zoneCellContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  zoneColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: "600",
  },
  zoneFullName: {
    fontSize: 11,
  },
  percentCell: {
    flex: 1,
    textAlign: "center",
  },
  rpeCell: {
    flex: 0.6,
    textAlign: "center",
  },
  paceCell: {
    flex: 1.5,
    textAlign: "right",
  },
  cell: {
    fontSize: 14,
  },
  zoneDescription: {
    fontSize: 11,
    fontStyle: "italic",
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    marginLeft: 28,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
});
