import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { hapticLight } from "@/lib/haptics";
import {
  usePlan,
  useUpdateWeekendSession,
  type WeekendSession,
  type WeekendPlanContent,
} from "@/hooks/usePlan";

// Helper to format pace (min/km)
function formatPace(km?: number, minutes?: number): string {
  if (!km || !minutes || km === 0) return "-";
  const paceMinutes = minutes / km;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper to parse time input (supports "45" or "1:30" formats)
function parseTimeInput(input: string): number | undefined {
  if (!input.trim()) return undefined;

  if (input.includes(":")) {
    const [hours, mins] = input.split(":").map(Number);
    if (isNaN(hours) || isNaN(mins)) return undefined;
    return hours * 60 + mins;
  }

  const mins = parseFloat(input);
  return isNaN(mins) ? undefined : mins;
}

// Helper to format time for display
function formatTime(minutes?: number): string {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} min`;
}

// Helper to format time for input field (minutes -> "h:mm" or "mm")
function formatTimeForInput(minutes?: number): string {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  }
  return `${mins}`;
}

const RPE_OPTIONS = [
  { value: 1, label: "Muy fácil", description: "Casi sin esfuerzo, podrías mantenerlo todo el día", color: "#22c55e" },
  { value: 2, label: "Fácil", description: "Esfuerzo ligero, conversación fluida", color: "#4ade80" },
  { value: 3, label: "Moderado", description: "Cómodo, podés hablar en oraciones completas", color: "#86efac" },
  { value: 4, label: "Algo difícil", description: "Respiración más fuerte, podés hablar con frases cortas", color: "#bef264" },
  { value: 5, label: "Difícil", description: "Incómodo, hablar cuesta un poco", color: "#facc15" },
  { value: 6, label: "Más difícil", description: "Hablar es difícil, podés decir pocas palabras", color: "#fbbf24" },
  { value: 7, label: "Muy difícil", description: "Casi no podés hablar, esfuerzo alto", color: "#fb923c" },
  { value: 8, label: "Muy intenso", description: "Sostenible solo unos minutos", color: "#f97316" },
  { value: 9, label: "Casi máximo", description: "Apenas podés continuar", color: "#ef4444" },
  { value: 10, label: "Máximo", description: "Esfuerzo total, imposible mantener", color: "#dc2626" },
];

// Weekend Session Log Modal
function WeekendLogModal({
  visible,
  onClose,
  session,
  onSave,
  onMarkIncomplete,
  isSaving,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  session: WeekendSession | null;
  onSave: (data: Partial<WeekendSession>) => void;
  onMarkIncomplete: () => void;
  isSaving: boolean;
  colors: typeof Colors.light;
}) {
  const [kmTotal, setKmTotal] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [rpe, setRpe] = useState("");
  const [observations, setObservations] = useState("");
  const [avgHR, setAvgHR] = useState("");
  const [maxHR, setMaxHR] = useState("");

  useEffect(() => {
    if (visible && session) {
      setKmTotal(session.km_total?.toString() ?? "");
      setTimeMinutes(formatTimeForInput(session.time_minutes));
      setRpe(session.rpe?.toString() ?? "");
      setObservations(session.observations ?? "");
      setAvgHR(session.avg_heart_rate?.toString() ?? "");
      setMaxHR(session.max_heart_rate?.toString() ?? "");
    }
  }, [visible, session]);

  const handleSave = () => {
    onSave({
      km_total: kmTotal ? parseFloat(kmTotal) : undefined,
      time_minutes: parseTimeInput(timeMinutes),
      rpe: rpe ? parseInt(rpe, 10) : undefined,
      observations: observations.trim() || undefined,
      avg_heart_rate: avgHR ? parseInt(avgHR, 10) : undefined,
      max_heart_rate: maxHR ? parseInt(maxHR, 10) : undefined,
      completed: true,
    });
  };

  const km = kmTotal ? parseFloat(kmTotal) : undefined;
  const mins = parseTimeInput(timeMinutes);
  const calculatedPace = formatPace(km, mins);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Registrar resultado
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {session && (
            <Text style={[styles.modalSessionName, { color: colors.tint }]}>
              {session.session}
            </Text>
          )}

          {session?.coach_notes && (
            <View
              style={[
                styles.modalCoachNotes,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <FontAwesome
                name="comment"
                size={13}
                color={colors.textSecondary}
                style={{ marginTop: 2 }}
              />
              <Text style={[styles.modalCoachNotesText, { color: colors.textSecondary }]}>
                {session.coach_notes}
              </Text>
            </View>
          )}

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Km Total
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={kmTotal}
                onChangeText={setKmTotal}
                placeholder="ej: 8.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Tiempo (min o h:mm)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={timeMinutes}
                onChangeText={setTimeMinutes}
                placeholder="ej: 45 o 1:30"
                placeholderTextColor={colors.textSecondary}
                keyboardType="default"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.rpeLabelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                RPE
              </Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Ritmo: {calculatedPace} /km
              </Text>
            </View>
            <View style={styles.rpeRow}>
              {RPE_OPTIONS.map((option) => {
                const isSelected = rpe === String(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.rpePill,
                      {
                        backgroundColor: isSelected
                          ? colors.tint
                          : colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() =>
                      setRpe(isSelected ? "" : String(option.value))
                    }
                  >
                    <Text
                      style={[
                        styles.rpePillText,
                        { color: isSelected ? "#fff" : colors.text },
                      ]}
                    >
                      {option.value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.rpeBarContainer}>
              {RPE_OPTIONS.map((option, i) => (
                <View
                  key={option.value}
                  style={[
                    styles.rpeBarSegment,
                    {
                      backgroundColor: option.color,
                      opacity: !rpe || parseInt(rpe, 10) === option.value ? 1 : 0.25,
                      borderTopLeftRadius: i === 0 ? 3 : 0,
                      borderBottomLeftRadius: i === 0 ? 3 : 0,
                      borderTopRightRadius: i === 9 ? 3 : 0,
                      borderBottomRightRadius: i === 9 ? 3 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            {rpe !== "" && (
              <Text style={[styles.rpeDescription, { color: colors.textSecondary }]}>
                {RPE_OPTIONS[parseInt(rpe, 10) - 1]?.label} — {RPE_OPTIONS[parseInt(rpe, 10) - 1]?.description}
              </Text>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                FC prom (bpm)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={avgHR}
                onChangeText={setAvgHR}
                placeholder="145"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                FC max (bpm)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={maxHR}
                onChangeText={setMaxHR}
                placeholder="175"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Observaciones
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={observations}
              onChangeText={setObservations}
              placeholder="¿Cómo te sentiste?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

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

          {session?.completed && (
            <TouchableOpacity
              style={[
                styles.markIncompleteButton,
                { borderColor: colors.border },
              ]}
              onPress={onMarkIncomplete}
              disabled={isSaving}
            >
              <Text
                style={[styles.markIncompleteText, { color: colors.textSecondary }]}
              >
                Marcar como no completado
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);

  const {
    data: weekendPlan,
    isLoading,
    refetch,
    isRefetching,
  } = usePlan(currentWeek);

  const updateWeekendSession = useUpdateWeekendSession();

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () =>
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekendPlanContent = weekendPlan?.content as WeekendPlanContent | undefined;

  // Calculate saturday and sunday dates for this week
  const saturday = addDays(currentWeek, 5);
  const sunday = addDays(currentWeek, 6);
  const sessionDates = [saturday, sunday];

  const handleOpenLog = (sessionIndex: number) => {
    hapticLight();
    setSelectedSessionIndex(sessionIndex);
    setLogModalVisible(true);
  };

  const handleSaveLog = (data: Partial<WeekendSession>) => {
    if (!weekendPlan || selectedSessionIndex === null) return;
    updateWeekendSession.mutate(
      {
        planId: weekendPlan.id,
        sessionIndex: selectedSessionIndex,
        sessionData: data,
        currentContent: weekendPlan.content,
      },
      {
        onSuccess: () => {
          setLogModalVisible(false);
          setSelectedSessionIndex(null);
        },
      }
    );
  };

  const handleMarkIncomplete = () => {
    if (!weekendPlan || selectedSessionIndex === null) return;
    updateWeekendSession.mutate(
      {
        planId: weekendPlan.id,
        sessionIndex: selectedSessionIndex,
        sessionData: {
          completed: false,
          km_total: undefined,
          time_minutes: undefined,
          rpe: undefined,
          observations: undefined,
        },
        currentContent: weekendPlan.content,
      },
      {
        onSuccess: () => {
          setLogModalVisible(false);
          setSelectedSessionIndex(null);
        },
      }
    );
  };

  const selectedSession =
    selectedSessionIndex !== null && weekendPlanContent?.sessions
      ? weekendPlanContent.sessions[selectedSessionIndex]
      : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.tint}
        />
      }
    >
      {/* Week Navigation */}
      <View style={[styles.weekNav, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <FontAwesome name="chevron-left" size={16} color={colors.tint} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToCurrentWeek}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>
            Finde del {format(addDays(currentWeek, 5), "d 'de' MMMM", { locale: es })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <FontAwesome name="chevron-right" size={16} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : !weekendPlan ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <FontAwesome
            name="calendar-o"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin plan para este fin de semana
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Tu coach aún no asignó una actividad
          </Text>
        </View>
      ) : (
        <View style={styles.planContainer}>
          {weekendPlanContent?.sessions.map((session, index) => {
            const sessionDate = sessionDates[index] ?? sessionDates[0];
            const formattedDate = format(sessionDate, "EEEE d MMM", { locale: es });
            // Capitalize first letter
            const displayDate =
              formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

            return (
              <View
                key={index}
                style={[styles.sessionCard, { backgroundColor: colors.card }]}
              >
                {/* Header: date + edit/completed badge */}
                <View style={styles.sessionHeader}>
                  <Text style={[styles.sessionDate, { color: colors.tint }]}>
                    {displayDate}
                  </Text>
                  <View style={styles.sessionHeaderRight}>
                    {session.completed && (
                      <TouchableOpacity
                        onPress={() => handleOpenLog(index)}
                        hitSlop={8}
                      >
                        <FontAwesome
                          name="pencil"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                    {session.completed && (
                      <View
                        style={[
                          styles.completedBadge,
                          { backgroundColor: colors.success },
                        ]}
                      >
                        <FontAwesome name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>

                {/* Session description */}
                <Text style={[styles.sessionDescription, { color: colors.text }]}>
                  {session.session}
                </Text>

                {/* Coach notes */}
                {session.coach_notes && (
                  <View
                    style={[
                      styles.coachNotesContainer,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <FontAwesome
                      name="comment"
                      size={13}
                      color={colors.textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <View style={styles.coachNotesTextContainer}>
                      <Text
                        style={[styles.coachNotesLabel, { color: colors.textSecondary }]}
                      >
                        Coach:
                      </Text>
                      <Text
                        style={[styles.coachNotesText, { color: colors.textSecondary }]}
                      >
                        {session.coach_notes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Runner observations (if completed) */}
                {session.completed && session.observations && (
                  <View
                    style={[
                      styles.coachNotesContainer,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <FontAwesome
                      name="comment-o"
                      size={13}
                      color={colors.textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <View style={styles.coachNotesTextContainer}>
                      <Text
                        style={[styles.coachNotesLabel, { color: colors.textSecondary }]}
                      >
                        Vos:
                      </Text>
                      <Text
                        style={[styles.coachNotesText, { color: colors.textSecondary }]}
                      >
                        {session.observations}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Results (if completed) */}
                {session.completed && (
                  <>
                    <View style={styles.resultsGrid}>
                      <View style={styles.resultItem}>
                        <Text
                          style={[styles.resultValue, { color: colors.text }]}
                        >
                          {session.km_total ?? "-"}
                        </Text>
                        <Text
                          style={[styles.resultLabel, { color: colors.textSecondary }]}
                        >
                          km
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.resultDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.resultItem}>
                        <Text
                          style={[styles.resultValue, { color: colors.text }]}
                        >
                          {formatTime(session.time_minutes)}
                        </Text>
                        <Text
                          style={[styles.resultLabel, { color: colors.textSecondary }]}
                        >
                          tiempo
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.resultDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.resultItem}>
                        <Text
                          style={[styles.resultValue, { color: colors.text }]}
                        >
                          {formatPace(session.km_total, session.time_minutes)}/km
                        </Text>
                        <Text
                          style={[styles.resultLabel, { color: colors.textSecondary }]}
                        >
                          ritmo
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.resultDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.resultItem}>
                        <Text
                          style={[styles.resultValue, { color: colors.text }]}
                        >
                          RPE {session.rpe ?? "-"}
                        </Text>
                        <Text
                          style={[styles.resultLabel, { color: colors.textSecondary }]}
                        >
                          esfuerzo
                        </Text>
                      </View>
                    </View>

                    {(session.avg_heart_rate || session.max_heart_rate) && (
                      <View style={styles.hrRow}>
                        <FontAwesome name="heartbeat" size={13} color="#ef4444" />
                        <Text style={[styles.hrText, { color: colors.textSecondary }]}>
                          {[
                            session.avg_heart_rate && `${session.avg_heart_rate} bpm prom`,
                            session.max_heart_rate && `${session.max_heart_rate} bpm máx`,
                          ].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Action button (only when not completed) */}
                {!session.completed && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.tint },
                    ]}
                    onPress={() => handleOpenLog(index)}
                  >
                    <FontAwesome name="plus" size={14} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                      Registrar resultado
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <WeekendLogModal
        visible={logModalVisible}
        onClose={() => {
          setLogModalVisible(false);
          setSelectedSessionIndex(null);
        }}
        session={selectedSession}
        onSave={handleSaveLog}
        onMarkIncomplete={handleMarkIncomplete}
        isSaving={updateWeekendSession.isPending}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyState: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  planContainer: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  // Session card
  sessionCard: {
    borderRadius: 16,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
  // Coach notes
  coachNotesContainer: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    gap: 8,
  },
  coachNotesTextContainer: {
    flex: 1,
  },
  coachNotesLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  coachNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Results grid
  resultsGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  resultItem: {
    flex: 1,
    alignItems: "center",
  },
  resultValue: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  resultLabel: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  resultDivider: {
    width: 1,
    height: 28,
    opacity: 0.5,
  },
  hrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingLeft: 4,
  },
  hrText: {
    fontSize: 12,
  },
  observations: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
  },
  // Action button
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalSessionName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  modalCoachNotes: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  modalCoachNotesText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  calculatedField: {
    justifyContent: "center",
  },
  rpeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rpeRow: {
    flexDirection: "row",
    gap: 6,
  },
  rpePill: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rpePillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  rpeBarContainer: {
    flexDirection: "row",
    height: 6,
    marginTop: 6,
    gap: 2,
  },
  rpeBarSegment: {
    flex: 1,
  },
  rpeDescription: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: "italic",
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  markIncompleteButton: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
  },
  markIncompleteText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
