import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import Colors from "@/constants/Colors";
import type { Activity } from "@/types/database";
import { hapticSuccess, hapticWarning } from "@/lib/haptics";

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

function formatCalculatedPace(km?: number, minutes?: number): string {
  if (!km || !minutes || km === 0) return "-";
  const paceMinutes = minutes / km;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export type ActivityModalSaveData = {
  id?: string;
  date: string;
  distance_km?: number;
  duration_seconds?: number;
  rpe?: number;
  title?: string;
  notes?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ActivityModalSaveData) => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  activity?: Activity | null;
  colors: typeof Colors.dark;
  initialDate?: Date;
};

export default function ActivityModal({
  visible,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  activity,
  colors,
  initialDate,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState("");

  const isEditMode = !!activity;

  const distanceKm = distance ? parseFloat(distance) : undefined;
  const durationMinutes = duration ? parseFloat(duration) : undefined;
  const calculatedPace = formatCalculatedPace(distanceKm, durationMinutes);

  // Pre-fill form when editing or set initial date
  useEffect(() => {
    if (activity) {
      setSelectedDate(new Date(activity.date));
      setDistance(activity.distance_km?.toString() ?? "");
      setDuration(
        activity.duration_seconds
          ? Math.round(activity.duration_seconds / 60).toString()
          : ""
      );
      setTitle(activity.title ?? "");
      setNotes(activity.notes ?? "");
      setRpe("");
    } else {
      // Reset form for new activity
      setSelectedDate(initialDate ?? new Date());
      setDistance("");
      setDuration("");
      setTitle("");
      setNotes("");
      setRpe("");
    }
  }, [activity, visible, initialDate]);

  const handlePreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleSave = () => {
    if (!distanceKm && !durationMinutes) {
      Alert.alert("Error", "Ingresá al menos la distancia o el tiempo");
      return;
    }

    hapticSuccess();
    onSave({
      id: activity?.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      distance_km: distanceKm,
      duration_seconds: durationMinutes ? durationMinutes * 60 : undefined,
      rpe: rpe ? parseInt(rpe, 10) : undefined,
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleDelete = () => {
    hapticWarning();
    Alert.alert(
      "Eliminar actividad",
      "¿Estás seguro que querés eliminar esta actividad?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: onDelete,
        },
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
              {isEditMode ? "Editar actividad" : "Agregar actividad"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Fecha
            </Text>
            <View
              style={[
                styles.datePicker,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handlePreviousDay}
                style={styles.dateNavButton}
              >
                <FontAwesome name="chevron-left" size={14} color={colors.tint} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToday} style={styles.dateDisplay}>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextDay}
                style={styles.dateNavButton}
              >
                <FontAwesome name="chevron-right" size={14} color={colors.tint} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Título (opcional)
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
              value={title}
              onChangeText={setTitle}
              placeholder="ej: Fondo largo"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Distancia (km)
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
                value={distance}
                onChangeText={setDistance}
                placeholder="10.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Tiempo (min)
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
                value={duration}
                onChangeText={setDuration}
                placeholder="55"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
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
              placeholder="¿Cómo te sentiste?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

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
                isEditMode && styles.saveButtonWithDelete,
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

const styles = StyleSheet.create({
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
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  dateNavButton: {
    padding: 12,
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 15,
    textTransform: "capitalize",
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
  saveButtonWithDelete: {
    flex: 1,
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
