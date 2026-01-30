import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Share } from "react-native";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, subMonths, addYears, subYears } from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/Colors";
import ActivityModal, { type ActivityModalSaveData } from "@/components/ActivityModal";
import {
  useActivitiesByRange,
  useActivityStatsByRange,
  useWeeklyKmBreakdown,
  useAddActivity,
  useUpdateActivity,
  useDeleteActivity,
  formatPace,
  formatDuration,
  formatDistance,
} from "@/hooks/useActivities";
import { showSuccess, showError } from "@/lib/toast";
import { hapticSelection, hapticLight } from "@/lib/haptics";
import { useAttendanceStreak } from "@/hooks/useTrainings";
import type { Activity } from "@/types/database";

function StatCard({ icon, label, value, unit, colors }: { icon: string; label: string; value: string | number; unit?: string; colors: typeof Colors.dark }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <FontAwesome name={icon as any} size={20} color={colors.tint} style={styles.statIcon} />
      <Text style={[styles.statValue, { color: colors.text }]}>
        {value}
        {unit && <Text style={styles.statUnit}> {unit}</Text>}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ActivityCard({ activity, colors, onPress, onShare }: { activity: Activity; colors: typeof Colors.dark; onPress: () => void; onShare: () => void }) {
  const date = new Date(activity.date);

  return (
    <TouchableOpacity style={[styles.activityCard, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.activityHeader}>
        <View style={styles.activityDateContainer}>
          <Text style={[styles.activityDay, { color: colors.tint }]}>{format(date, "d")}</Text>
          <Text style={[styles.activityMonth, { color: colors.textSecondary }]}>{format(date, "MMM", { locale: es })}</Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title ?? "Entrenamiento"}</Text>
          <View style={styles.activityMeta}>
            {activity.distance_km && <Text style={[styles.activityStat, { color: colors.textSecondary }]}>{formatDistance(activity.distance_km)}</Text>}
            {activity.duration_seconds && <Text style={[styles.activityStat, { color: colors.textSecondary }]}>{formatDuration(activity.duration_seconds)}</Text>}
            {activity.avg_pace_seconds && <Text style={[styles.activityStat, { color: colors.textSecondary }]}>{formatPace(activity.avg_pace_seconds)} /km</Text>}
          </View>
        </View>
        <View style={styles.activityActions}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => {
              hapticLight();
              onShare();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome name="share" size={12} color={colors.tint} />
          </TouchableOpacity>
          <View style={[styles.sourceTag, { backgroundColor: colors.backgroundSecondary }]}>
            <FontAwesome name={activity.source === "manual" ? "pencil" : "refresh"} size={10} color={colors.textSecondary} />
          </View>
        </View>
      </View>
      {activity.notes && (
        <Text style={[styles.activityNotes, { color: colors.textSecondary }]} numberOfLines={2}>
          {activity.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

type StatsPeriod = "month" | "year" | "lifetime";

const LIFETIME_START = new Date(2020, 0, 1);

function getDateRange(period: StatsPeriod, currentMonth: Date, currentYear: Date): { start: Date; end: Date } {
  switch (period) {
    case "month":
      return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
    case "year":
      return { start: startOfYear(currentYear), end: endOfYear(currentYear) };
    case "lifetime":
      return { start: LIFETIME_START, end: new Date() };
  }
}

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { profile } = useAuth();

  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [currentYear, setCurrentYear] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const { start, end } = getDateRange(period, currentMonth, currentYear);

  const { data: activities, isLoading, refetch, isRefetching } = useActivitiesByRange(start, end);

  const { data: stats } = useActivityStatsByRange(start, end);
  const { data: kmBreakdown } = useWeeklyKmBreakdown(period, start, end);
  const { data: streak } = useAttendanceStreak();

  const addActivity = useAddActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToCurrentMonth = () => setCurrentMonth(startOfMonth(new Date()));

  const goToPreviousYear = () => setCurrentYear(subYears(currentYear, 1));
  const goToNextYear = () => setCurrentYear(addYears(currentYear, 1));
  const goToCurrentYear = () => setCurrentYear(new Date());

  const openAddModal = () => {
    setEditingActivity(null);
    setModalVisible(true);
  };

  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingActivity(null);
  };

  const handleSaveActivity = (data: ActivityModalSaveData) => {
    if (data.id) {
      // Update existing activity
      updateActivity.mutate(
        {
          id: data.id,
          date: data.date,
          distance_km: data.distance_km,
          duration_seconds: data.duration_seconds,
          title: data.title,
          notes: data.notes,
        },
        {
          onSuccess: () => {
            closeModal();
            showSuccess("Actividad actualizada");
          },
          onError: (error: any) => {
            showError(error.message || "No se pudo actualizar la actividad");
          },
        },
      );
    } else {
      // Add new activity
      addActivity.mutate(data, {
        onSuccess: () => {
          closeModal();
          showSuccess("Actividad guardada");
        },
        onError: (error: any) => {
          showError(error.message || "No se pudo guardar la actividad");
        },
      });
    }
  };

  const handleShareActivity = async (activity: Activity) => {
    const parts: string[] = [];
    if (activity.distance_km) {
      parts.push(`${formatDistance(activity.distance_km)} km`);
    }
    if (activity.duration_seconds) {
      parts.push(`en ${formatDuration(activity.duration_seconds)}`);
    }
    if (activity.avg_pace_seconds) {
      parts.push(`(ritmo ${formatPace(activity.avg_pace_seconds)}/km)`);
    }

    const message = parts.length > 0 ? `Corrí ${parts.join(" ")} #Neos` : `Entrené hoy #Neos`;

    try {
      await Share.share({ message });
    } catch {}
  };

  const handleDeleteActivity = () => {
    if (!editingActivity) return;

    deleteActivity.mutate(editingActivity.id, {
      onSuccess: () => {
        closeModal();
        showSuccess("Actividad eliminada");
      },
      onError: (error: any) => {
        showError(error.message || "No se pudo eliminar la actividad");
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.tint} />}
    >
      {/* Period Selector */}
      <View style={[styles.periodSelector, { backgroundColor: colors.card }]}>
        {(["month", "year", "lifetime"] as StatsPeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodPill, period === p && { backgroundColor: colors.tint }]}
            onPress={() => {
              hapticSelection();
              setPeriod(p);
            }}
          >
            <Text style={[styles.periodPillText, { color: period === p ? "#fff" : colors.textSecondary }]}>{p === "month" ? "Mes" : p === "year" ? "Año" : "Total"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period Navigation */}
      {period === "month" && (
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={16} color={colors.tint} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToCurrentMonth}>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{format(currentMonth, "MMMM yyyy", { locale: es })}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={16} color={colors.tint} />
          </TouchableOpacity>
        </View>
      )}

      {period === "year" && (
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goToPreviousYear} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={16} color={colors.tint} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToCurrentYear}>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{format(currentYear, "yyyy")}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextYear} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={16} color={colors.tint} />
          </TouchableOpacity>
        </View>
      )}

      {period === "lifetime" && (
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>Todas las actividades</Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard icon="road" label={period === "month" ? "Km este mes" : period === "year" ? "Km este año" : "Km totales"} value={stats?.totalKm ?? 0} unit="km" colors={colors} />
        <StatCard
          icon="clock-o"
          label={period === "month" ? "Tiempo este mes" : period === "year" ? "Tiempo este año" : "Tiempo total"}
          value={stats?.totalMinutes ?? 0}
          unit="min"
          colors={colors}
        />
        <StatCard icon="fire" label="Racha" value={streak ?? 0} unit="días" colors={colors} />
        <StatCard icon="tachometer" label="Ritmo prom." value={stats?.avgPaceSeconds ? formatPace(stats.avgPaceSeconds) : "-"} unit="/km" colors={colors} />
      </View>

      {/* Km Chart */}
      {kmBreakdown &&
        kmBreakdown.length > 0 &&
        kmBreakdown.some((d) => d.km > 0) &&
        (() => {
          const maxKm = Math.max(...kmBreakdown.map((d) => d.km));
          return (
            <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>{period === "year" || period === "lifetime" ? "Km por mes" : "Km por semana"}</Text>
              <View style={styles.chartBars}>
                {kmBreakdown.map((item, i) => (
                  <View key={i} style={styles.chartBarCol}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: maxKm > 0 ? `${(item.km / maxKm) * 100}%` : "0%",
                            backgroundColor: colors.tint,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartBarValue, { color: colors.text }]}>{item.km > 0 ? Math.round(item.km) : ""}</Text>
                    <Text style={[styles.chartBarLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

      {/* Activities List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actividades ({activities?.length ?? 0})</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]} onPress={openAddModal}>
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.addButtonText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : activities && activities.length > 0 ? (
          <View style={styles.activitiesList}>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} colors={colors} onPress={() => openEditModal(activity)} onShare={() => handleShareActivity(activity)} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <FontAwesome name="calendar-o" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin actividades</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {period === "month" ? "No hay actividades registradas este mes." : period === "year" ? "No hay actividades registradas este año." : "No hay actividades registradas."}{" "}
              Agregá una manualmente o sincronizá desde Garmin.
            </Text>
          </View>
        )}
      </View>

      <ActivityModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        isSaving={addActivity.isPending || updateActivity.isPending}
        isDeleting={deleteActivity.isPending}
        activity={editingActivity}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  periodPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  chartContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    paddingBottom: 12,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 140,
  },
  chartBarCol: {
    flex: 1,
    alignItems: "center",
  },
  chartBarTrack: {
    width: "100%",
    height: 100,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  chartBar: {
    width: "70%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    height: 14,
  },
  chartBarLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "normal",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  activitiesList: {
    gap: 8,
  },
  activityCard: {
    padding: 12,
    borderRadius: 12,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityDateContainer: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 40,
  },
  activityDay: {
    fontSize: 20,
    fontWeight: "bold",
  },
  activityMonth: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: "row",
    gap: 12,
  },
  activityStat: {
    fontSize: 13,
  },
  activityActions: {
    alignItems: "center",
    gap: 6,
  },
  shareButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  activityNotes: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
