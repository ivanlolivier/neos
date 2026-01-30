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

// Zone definitions with percentages of VAM
// Lower percentage = faster pace (more intense)
// Higher percentage = slower pace (less intense)
const ZONES = [
  {
    name: "R1-Recuperación",
    shortName: "R1",
    percentage: 167, // 100/60 = 1.67
    color: "#00BFFF",
    zone: 1,
  },
  {
    name: "R2-Aeróbico",
    shortName: "R2",
    percentageRange: [167, 143], // 100/60, 100/70
    color: "#00FF00",
    zone: 1,
  },
  {
    name: "R3-Tempo",
    shortName: "R3",
    percentageRange: [143, 133], // 100/70, 100/75
    color: "#FFFF00",
    zone: 2,
  },
  {
    name: "R4-SubUmbral",
    shortName: "R4",
    percentageRange: [125, 118], // 100/80, 100/85
    color: "#FFFF00",
    zone: 2,
  },
  {
    name: "R5-SupUmbral",
    shortName: "R5",
    percentageRange: [111, 105], // 100/90, 100/95
    color: "#FFA500",
    zone: 3,
  },
  {
    name: "R6-Vo2",
    shortName: "R6",
    percentageRange: [100, 83], // 100/100, 100/120
    color: "#FF0000",
    zone: 3,
  },
];

// VAM percentages for display (original percentages)
const ZONE_PERCENTAGES = [
  { single: 60 },
  { range: [60, 70] },
  { range: [70, 75] },
  { range: [80, 85] },
  { range: [90, 95] },
  { range: [100, 120] },
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

// Calculate pace for a given percentage
// percentage > 100 means slower (recovery)
// percentage < 100 means faster (intense)
function calculateZonePace(vamSeconds: number, percentage: number): string {
  const paceSeconds = (vamSeconds * percentage) / 100;
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
                style={[styles.headerCell, styles.paceCell, { color: colors.text }]}
              >
                Ritmo
              </Text>
            </View>
          </View>

          {/* Table Body */}
          <View style={[styles.tableBody, { backgroundColor: colors.card }]}>
            {ZONES.map((zone, index) => {
              const zonePercent = ZONE_PERCENTAGES[index];
              const isRange = zone.percentageRange !== undefined;

              let paceDisplay: string;
              let percentDisplay: string;

              if (isRange) {
                const paceStart = calculateZonePace(
                  vamSeconds,
                  zone.percentageRange![0]
                );
                const paceEnd = calculateZonePace(
                  vamSeconds,
                  zone.percentageRange![1]
                );
                paceDisplay = `${paceStart} - ${paceEnd}`;
                percentDisplay = `${zonePercent.range![0]}-${zonePercent.range![1]}%`;
              } else {
                paceDisplay = calculateZonePace(vamSeconds, zone.percentage!);
                percentDisplay = `${zonePercent.single}%`;
              }

              return (
                <View key={zone.name}>
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
                          {zone.name.split("-")[1]}
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
                        styles.paceCell,
                        { color: colors.tint },
                      ]}
                    >
                      {paceDisplay}
                    </Text>
                  </View>
                  {index < ZONES.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Zone Groups Legend */}
          <View style={styles.legendSection}>
            <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>
              Grupos de Zonas
            </Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendItem, { backgroundColor: colors.card }]}>
                <View style={[styles.legendColor, { backgroundColor: "#00BFFF" }]} />
                <View style={[styles.legendColor, { backgroundColor: "#00FF00" }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Zona 1 - Base
                </Text>
              </View>
              <View style={[styles.legendItem, { backgroundColor: colors.card }]}>
                <View style={[styles.legendColor, { backgroundColor: "#FFFF00" }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Zona 2 - Umbral
                </Text>
              </View>
              <View style={[styles.legendItem, { backgroundColor: colors.card }]}>
                <View style={[styles.legendColor, { backgroundColor: "#FFA500" }]} />
                <View style={[styles.legendColor, { backgroundColor: "#FF0000" }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Zona 3 - Alta
                </Text>
              </View>
            </View>
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
  paceCell: {
    flex: 1.5,
    textAlign: "right",
  },
  cell: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginLeft: 28,
  },
  legendSection: {
    marginTop: 16,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  legendRow: {
    flexDirection: "row",
    gap: 8,
  },
  legendItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    marginLeft: 4,
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
