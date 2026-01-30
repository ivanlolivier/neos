import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { showSuccess, showError } from "@/lib/toast";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics";
import {
  usePersonalRecords,
  useAddPersonalRecord,
  useUpdatePersonalRecord,
  useDeletePersonalRecord,
} from "@/hooks/usePersonalRecords";
import type { PersonalRecord } from "@/types/database";

const PRESET_EVENTS = ["5K", "10K", "21K", "42K"];

function formatRecordTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTimeToSeconds(input: string): number | null {
  const parts = input.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    // h:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  }
  return null;
}

function RecordModal({
  visible,
  onClose,
  onSave,
  onDelete,
  record,
  isSaving,
  isDeleting,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    event_name: string;
    result_seconds: number;
    date?: string;
    location?: string;
    notes?: string;
    is_official?: boolean;
  }) => void;
  onDelete?: () => void;
  record: PersonalRecord | null;
  isSaving: boolean;
  isDeleting?: boolean;
  colors: typeof Colors.dark;
}) {
  const [eventName, setEventName] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);

  const isEditMode = !!record;

  useEffect(() => {
    if (visible) {
      if (record) {
        const isPreset = PRESET_EVENTS.includes(record.event_name);
        setEventName(isPreset ? record.event_name : "Otro");
        setCustomEvent(isPreset ? "" : record.event_name);
        setTimeInput(formatRecordTime(record.result_seconds));
        setDate(record.date ?? "");
        setLocation(record.location ?? "");
        setNotes(record.notes ?? "");
        setIsOfficial(record.is_official);
      } else {
        setEventName("");
        setCustomEvent("");
        setTimeInput("");
        setDate("");
        setLocation("");
        setNotes("");
        setIsOfficial(false);
      }
    }
  }, [visible, record]);

  const handleSave = () => {
    const finalEvent =
      eventName === "Otro" ? customEvent.trim() : eventName;
    if (!finalEvent) {
      Alert.alert("Error", "Seleccioná un evento");
      return;
    }

    const seconds = parseTimeToSeconds(timeInput);
    if (seconds === null || seconds <= 0) {
      Alert.alert(
        "Error",
        "Ingresá el tiempo en formato mm:ss o h:mm:ss"
      );
      return;
    }

    hapticSuccess();
    onSave({
      event_name: finalEvent,
      result_seconds: seconds,
      date: date.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      is_official: isOfficial,
    });
  };

  const handleDelete = () => {
    hapticWarning();
    Alert.alert(
      "Eliminar record",
      "¿Estás seguro que querés eliminar este record?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditMode ? "Editar record" : "Nuevo record"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome
                name="times"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Event pills */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Evento
            </Text>
            <View style={styles.pillsRow}>
              {[...PRESET_EVENTS, "Otro"].map((ev) => {
                const isSelected = eventName === ev;
                return (
                  <TouchableOpacity
                    key={ev}
                    style={[
                      styles.eventPill,
                      {
                        backgroundColor: isSelected
                          ? colors.tint
                          : colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setEventName(isSelected ? "" : ev)}
                  >
                    <Text
                      style={[
                        styles.eventPillText,
                        { color: isSelected ? "#fff" : colors.text },
                      ]}
                    >
                      {ev}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {eventName === "Otro" && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                    marginTop: 8,
                  },
                ]}
                value={customEvent}
                onChangeText={setCustomEvent}
                placeholder="ej: Test Cooper, 15K"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            )}
          </View>

          {/* Time */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Tiempo (mm:ss o h:mm:ss)
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
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="ej: 25:30 o 1:45:00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Date + Location */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Fecha (opcional)
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
                value={date}
                onChangeText={setDate}
                placeholder="yyyy-mm-dd"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Lugar (opcional)
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
                value={location}
                onChangeText={setLocation}
                placeholder="ej: Montevideo"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Official toggle */}
          <View style={[styles.formGroup, styles.toggleRow]}>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
              Carrera oficial
            </Text>
            <Switch
              value={isOfficial}
              onValueChange={setIsOfficial}
              trackColor={{ true: colors.tint }}
            />
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Notas (opcional)
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
              value={notes}
              onChangeText={setNotes}
              placeholder="Condiciones, sensaciones..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            {isEditMode && onDelete && (
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.error }]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <FontAwesome name="trash" size={18} color={colors.error} />
                )}
              </TouchableOpacity>
            )}
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
                <Text style={styles.saveButtonText}>
                  {isEditMode ? "Guardar cambios" : "Guardar"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PersonalRecordsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { data: records, isLoading } = usePersonalRecords();
  const addRecord = useAddPersonalRecord();
  const updateRecord = useUpdatePersonalRecord();
  const deleteRecord = useDeletePersonalRecord();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(
    null
  );

  const openAdd = () => {
    hapticLight();
    setEditingRecord(null);
    setModalVisible(true);
  };

  const openEdit = (record: PersonalRecord) => {
    hapticLight();
    setEditingRecord(record);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
  };

  const handleSave = (data: {
    event_name: string;
    result_seconds: number;
    date?: string;
    location?: string;
    notes?: string;
    is_official?: boolean;
  }) => {
    if (editingRecord) {
      updateRecord.mutate(
        { id: editingRecord.id, ...data },
        {
          onSuccess: () => {
            closeModal();
            showSuccess("Record actualizado");
          },
          onError: (error: any) => {
            showError(error.message || "No se pudo actualizar");
          },
        }
      );
    } else {
      addRecord.mutate(data, {
        onSuccess: () => {
          closeModal();
          showSuccess("Record guardado");
        },
        onError: (error: any) => {
          showError(error.message || "No se pudo guardar");
        },
      });
    }
  };

  const handleDelete = () => {
    if (!editingRecord) return;
    deleteRecord.mutate(editingRecord.id, {
      onSuccess: () => {
        closeModal();
        showSuccess("Record eliminado");
      },
      onError: (error: any) => {
        showError(error.message || "No se pudo eliminar");
      },
    });
  };

  // Group records by event, showing best time for each
  const groupedRecords = (records ?? []).reduce(
    (acc, record) => {
      if (!acc[record.event_name]) {
        acc[record.event_name] = [];
      }
      acc[record.event_name].push(record);
      return acc;
    },
    {} as Record<string, PersonalRecord[]>
  );

  // Sort events: presets first in order, then custom alphabetically
  const sortedEvents = Object.keys(groupedRecords).sort((a, b) => {
    const ai = PRESET_EVENTS.indexOf(a);
    const bi = PRESET_EVENTS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

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
        <Text style={[styles.title, { color: colors.text }]}>Mis Records</Text>
        <TouchableOpacity
          style={[styles.addHeaderButton, { backgroundColor: colors.tint }]}
          onPress={openAdd}
        >
          <FontAwesome name="plus" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : sortedEvents.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <FontAwesome name="trophy" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin records todavía
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            Agregá tu primera marca personal para ir registrando tu progreso.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
            onPress={openAdd}
          >
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.emptyButtonText}>Agregar record</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.recordsList}>
          {sortedEvents.map((eventName) => {
            const eventRecords = groupedRecords[eventName];
            // Sort by time ascending (best first)
            const sorted = [...eventRecords].sort(
              (a, b) => a.result_seconds - b.result_seconds
            );
            const best = sorted[0];

            return (
              <View
                key={eventName}
                style={[styles.eventCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventNameRow}>
                    <FontAwesome
                      name="trophy"
                      size={16}
                      color={colors.tint}
                    />
                    <Text
                      style={[styles.eventName, { color: colors.text }]}
                    >
                      {eventName}
                    </Text>
                  </View>
                  <Text style={[styles.bestTime, { color: colors.tint }]}>
                    {formatRecordTime(best.result_seconds)}
                  </Text>
                </View>

                {best.date && (
                  <Text
                    style={[
                      styles.recordDetail,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {best.date}
                    {best.location ? ` · ${best.location}` : ""}
                    {best.is_official ? " · Oficial" : ""}
                  </Text>
                )}

                {/* All records for this event */}
                {sorted.map((record) => (
                  <TouchableOpacity
                    key={record.id}
                    style={[
                      styles.recordRow,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={() => openEdit(record)}
                  >
                    <Text
                      style={[styles.recordTime, { color: colors.text }]}
                    >
                      {formatRecordTime(record.result_seconds)}
                    </Text>
                    <View style={styles.recordMeta}>
                      {record.date && (
                        <Text
                          style={[
                            styles.recordMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {record.date}
                        </Text>
                      )}
                      {record.location && (
                        <Text
                          style={[
                            styles.recordMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {record.location}
                        </Text>
                      )}
                      {record.is_official && (
                        <FontAwesome
                          name="certificate"
                          size={12}
                          color={colors.tint}
                        />
                      )}
                    </View>
                    <FontAwesome
                      name="chevron-right"
                      size={12}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>
      )}

      <RecordModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
        record={editingRecord}
        isSaving={addRecord.isPending || updateRecord.isPending}
        isDeleting={deleteRecord.isPending}
        colors={colors}
      />
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
  addHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
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
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  recordsList: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eventNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "700",
  },
  bestTime: {
    fontSize: 20,
    fontWeight: "bold",
  },
  recordDetail: {
    fontSize: 12,
    marginBottom: 10,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  recordTime: {
    fontSize: 15,
    fontWeight: "600",
    width: 80,
  },
  recordMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordMetaText: {
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 64,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  eventPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  eventPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
