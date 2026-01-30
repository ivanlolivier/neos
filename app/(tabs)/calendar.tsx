import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useState, useCallback } from "react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  useWeeklyTrainings,
  useRespondToPoll,
  formatTimeSlot,
  getTrainingTypeLabel,
  getTrainingTypeColor,
  type TrainingWithSession,
  type AttendeeInfo,
} from "@/hooks/useTrainings";
import { useActivitiesByRange, useAddActivity, formatDistance, formatDuration } from "@/hooks/useActivities";
import { usePlan, type WeekendPlanContent, type WeekendSession } from "@/hooks/usePlan";
import { useWeekWeather } from "@/hooks/useWeather";
import { getWeatherInfo } from "@/lib/weather";
import ActivityModal from "@/components/ActivityModal";
import type { ActivityModalSaveData } from "@/components/ActivityModal";
import type { Activity } from "@/types/database";
import { showSuccess, showError } from "@/lib/toast";
import { hapticSelection, hapticLight } from "@/lib/haptics";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const { data: trainings, isLoading, refetch: refetchTrainings, isRefetching: isRefetchingTrainings } =
    useWeeklyTrainings(currentWeek);
  const respondToPoll = useRespondToPoll();

  const weekEnd = addDays(currentWeek, 6);
  const { data: activities, refetch: refetchActivities, isRefetching: isRefetchingActivities } =
    useActivitiesByRange(currentWeek, weekEnd);
  const { data: weekendPlan, refetch: refetchPlan, isRefetching: isRefetchingPlan } =
    usePlan(currentWeek);
  const { data: weatherData } = useWeekWeather();
  const addActivity = useAddActivity();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [attendeesModal, setAttendeesModal] = useState<TrainingWithSession | null>(null);
  const [expandedAvatar, setExpandedAvatar] = useState<{ url: string; name: string } | null>(null);

  const isRefetching = isRefetchingTrainings || isRefetchingActivities || isRefetchingPlan;
  const onRefresh = useCallback(() => {
    refetchTrainings();
    refetchActivities();
    refetchPlan();
  }, [refetchTrainings, refetchActivities, refetchPlan]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () =>
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const openAddModal = (date: Date) => {
    hapticLight();
    setModalInitialDate(date);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalInitialDate(undefined);
  };

  const handleSaveActivity = (data: ActivityModalSaveData) => {
    addActivity.mutate(data, {
      onSuccess: () => {
        closeModal();
        showSuccess("Actividad guardada");
      },
      onError: (error: any) => {
        showError(error.message || "No se pudo guardar la actividad");
      },
    });
  };

  const getDayWeather = (day: Date) => {
    if (!weatherData) return null;
    const dateKey = format(day, "yyyy-MM-dd");
    const dayData = weatherData[dateKey];
    if (!dayData) return null;
    // Use midday (12) for the day's representative weather
    const hourData = dayData[12] ?? dayData[9] ?? dayData[15];
    if (!hourData) return null;
    return {
      temperature: hourData.temperature,
      info: getWeatherInfo(hourData.weatherCode),
    };
  };

  const getTrainingsForDay = (date: Date) => {
    return trainings?.filter((t) => {
      const dayOfWeek = date.getDay();
      return t.day_of_week === dayOfWeek;
    }) ?? [];
  };

  const getActivitiesForDay = (day: Date): Activity[] => {
    const dayStr = format(day, "yyyy-MM-dd");
    return activities?.filter((a) => a.date === dayStr) ?? [];
  };

  const getPlanSessionsForDay = (day: Date): (WeekendSession & { index: number })[] => {
    const weekendContent = weekendPlan?.content as WeekendPlanContent | undefined;
    if (!weekendContent?.sessions) return [];

    const saturday = addDays(currentWeek, 5);
    const sunday = addDays(currentWeek, 6);

    const result: (WeekendSession & { index: number })[] = [];
    if (isSameDay(day, saturday) && weekendContent.sessions[0]) {
      result.push({ ...weekendContent.sessions[0], index: 0 });
    }
    if (isSameDay(day, sunday) && weekendContent.sessions[1]) {
      result.push({ ...weekendContent.sessions[1], index: 1 });
    }
    return result;
  };

  const handleVote = (
    training: TrainingWithSession,
    date: Date,
    timeSlot: string | null,
    status: "confirmed" | "not_going"
  ) => {
    hapticSelection();
    respondToPoll.mutate({
      trainingId: training.id,
      date: format(date, "yyyy-MM-dd"),
      timeSlot,
      status,
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
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
            {format(currentWeek, "d MMM", { locale: es })} -{" "}
            {format(addDays(currentWeek, 6), "d MMM", { locale: es })}
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
      ) : (
        <View style={styles.weekContainer}>
          {weekDays.map((day) => {
            const dayTrainings = getTrainingsForDay(day);
            const dayActivities = getActivitiesForDay(day);
            const dayPlanSessions = getPlanSessionsForDay(day);
            const isToday = isSameDay(day, new Date());
            const hasIndicators = dayActivities.length > 0 || dayPlanSessions.length > 0;
            const isRest = dayTrainings.length === 0 && !hasIndicators;
            const weather = getDayWeather(day);

            return (
              <View
                key={day.toISOString()}
                style={[
                  styles.dayContainer,
                  { backgroundColor: colors.card },
                  isToday && { borderColor: colors.tint, borderWidth: 2 },
                ]}
              >
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    <Text
                      style={[
                        styles.dayName,
                        { color: isToday ? colors.tint : colors.textSecondary },
                      ]}
                    >
                      {format(day, "EEE", { locale: es }).toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: isToday ? colors.tint : colors.text },
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                  <View style={styles.dayHeaderRight}>
                    {weather && (
                      <View style={styles.weatherBadge}>
                        <FontAwesome
                          name={weather.info.icon}
                          size={12}
                          color={weather.info.color}
                        />
                        <Text
                          style={[
                            styles.weatherTemp,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {weather.temperature}°
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.addDayButton,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => openAddModal(day)}
                    >
                      <FontAwesome name="plus" size={10} color={colors.tint} />
                    </TouchableOpacity>
                  </View>
                </View>

                {dayTrainings.length > 0 && (
                  <View style={styles.trainingsContainer}>
                    {dayTrainings.map((training) => {
                      const typeColor = getTrainingTypeColor(training.type);
                      const userStatus = training.userAttendance?.status;
                      const userTimeSlot = training.userAttendance?.time_slot;
                      const isNotGoing = userStatus === "not_going";
                      const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

                      return (
                        <View
                          key={training.id}
                          style={[
                            styles.trainingItem,
                            { borderLeftColor: typeColor },
                          ]}
                        >
                          <Text
                            style={[styles.trainingName, { color: colors.text }]}
                          >
                            {training.name}
                          </Text>
                          <View style={styles.trainingTypeRow}>
                            <Text
                              style={[
                                styles.trainingType,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {getTrainingTypeLabel(training.type)}
                            </Text>
                            {training.attendeeCount > 0 && (
                              <TouchableOpacity
                                style={styles.attendeeCount}
                                onPress={() => setAttendeesModal(training)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <FontAwesome
                                  name="user"
                                  size={10}
                                  color={colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.attendeeCountText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {training.attendeeCount}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={styles.timeSlotsContainer}>
                            {training.time_slots.map((slot) => {
                              const isSlotConfirmed =
                                userStatus === "confirmed" &&
                                userTimeSlot === slot;

                              return (
                                <TouchableOpacity
                                  key={slot}
                                  style={[
                                    styles.timeSlot,
                                    {
                                      backgroundColor: isSlotConfirmed
                                        ? colors.tint
                                        : colors.backgroundSecondary,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleVote(training, day, slot, "confirmed")
                                  }
                                  disabled={respondToPoll.isPending}
                                >
                                  <Text
                                    style={[
                                      styles.timeSlotText,
                                      {
                                        color: isSlotConfirmed
                                          ? "#fff"
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {formatTimeSlot(slot)}
                                  </Text>
                                  {isSlotConfirmed && (
                                    <FontAwesome
                                      name="check"
                                      size={10}
                                      color="#fff"
                                    />
                                  )}
                                </TouchableOpacity>
                              );
                            })}

                            {/* No voy / No fui button */}
                            <TouchableOpacity
                              style={[
                                styles.timeSlot,
                                styles.notGoingSlot,
                                {
                                  backgroundColor: isNotGoing
                                    ? colors.error
                                    : colors.backgroundSecondary,
                                },
                              ]}
                              onPress={() =>
                                handleVote(training, day, null, "not_going")
                              }
                              disabled={respondToPoll.isPending}
                            >
                              <Text
                                style={[
                                  styles.timeSlotText,
                                  {
                                    color: isNotGoing ? "#fff" : colors.textSecondary,
                                  },
                                ]}
                              >
                                {isPast ? "No fui" : "No voy"}
                              </Text>
                              {isNotGoing && (
                                <FontAwesome
                                  name="times"
                                  size={10}
                                  color="#fff"
                                />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Indicators: activities + plan sessions */}
                {hasIndicators && (
                  <View
                    style={[
                      styles.indicatorsContainer,
                      dayTrainings.length > 0 && styles.indicatorsSeparator,
                      dayTrainings.length > 0 && { borderTopColor: colors.border },
                    ]}
                  >
                    {dayActivities.map((activity) => (
                      <View key={activity.id} style={styles.indicatorRow}>
                        <FontAwesome name="road" size={12} color={colors.tint} />
                        <Text style={[styles.indicatorText, { color: colors.tint }]}>
                          {formatDistance(activity.distance_km)}
                          {activity.duration_seconds
                            ? ` · ${formatDuration(activity.duration_seconds)}`
                            : ""}
                        </Text>
                      </View>
                    ))}
                    {dayPlanSessions.map((session) => (
                      <View key={session.index} style={styles.indicatorRow}>
                        <FontAwesome
                          name={session.completed ? "check-circle" : "bullseye"}
                          size={12}
                          color={session.completed ? colors.success : colors.warning}
                        />
                        <Text
                          style={[
                            styles.indicatorText,
                            {
                              color: session.completed ? colors.success : colors.warning,
                            },
                          ]}
                        >
                          {session.session}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {isRest && (
                  <Text style={[styles.noTraining, { color: colors.textSecondary }]}>
                    Descanso
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <ActivityModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSaveActivity}
        isSaving={addActivity.isPending}
        colors={colors}
        initialDate={modalInitialDate}
      />

      {/* Attendees Modal */}
      <Modal
        visible={!!attendeesModal}
        animationType="slide"
        transparent
      >
        <TouchableOpacity
          style={styles.attendeesOverlay}
          activeOpacity={1}
          onPress={() => { setExpandedAvatar(null); setAttendeesModal(null); }}
        >
          <View
            style={[styles.attendeesContent, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.attendeesHandle}>
              <View style={[styles.attendeesHandleBar, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.attendeesTitle, { color: colors.text }]}>
              {attendeesModal?.name}
            </Text>

            {attendeesModal && (
              <ScrollView style={styles.attendeesScroll}>
                {attendeesModal.time_slots.map((slot) => {
                  const slotAttendees = attendeesModal.attendeesBySlot[slot] ?? [];
                  if (slotAttendees.length === 0) return null;
                  return (
                    <View key={slot} style={styles.attendeesSlotSection}>
                      <View style={styles.attendeesSlotHeader}>
                        <FontAwesome name="clock-o" size={13} color={colors.tint} />
                        <Text style={[styles.attendeesSlotLabel, { color: colors.tint }]}>
                          {formatTimeSlot(slot)}
                        </Text>
                        <Text style={[styles.attendeesSlotCount, { color: colors.textSecondary }]}>
                          ({slotAttendees.length})
                        </Text>
                      </View>
                      {slotAttendees.map((a) => (
                        <View key={a.id} style={styles.attendeeRow}>
                          <TouchableOpacity
                            style={[styles.attendeeAvatar, { backgroundColor: colors.backgroundSecondary }]}
                            onPress={() => a.avatar_url ? setExpandedAvatar({ url: a.avatar_url, name: a.full_name }) : null}
                            activeOpacity={a.avatar_url ? 0.7 : 1}
                          >
                            {a.avatar_url ? (
                              <Image source={{ uri: a.avatar_url }} style={styles.attendeeAvatarImg} />
                            ) : (
                              <Text style={[styles.attendeeInitial, { color: colors.tint }]}>
                                {a.full_name.charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <Text style={[styles.attendeeName, { color: colors.text }]}>
                            {a.full_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}

                {attendeesModal.notGoing.length > 0 && (
                  <View style={styles.attendeesSlotSection}>
                    <View style={styles.attendeesSlotHeader}>
                      <FontAwesome name="times-circle" size={13} color={colors.error} />
                      <Text style={[styles.attendeesSlotLabel, { color: colors.error }]}>
                        No van
                      </Text>
                      <Text style={[styles.attendeesSlotCount, { color: colors.textSecondary }]}>
                        ({attendeesModal.notGoing.length})
                      </Text>
                    </View>
                    {attendeesModal.notGoing.map((a) => (
                      <View key={a.id} style={styles.attendeeRow}>
                        <TouchableOpacity
                          style={[styles.attendeeAvatar, { backgroundColor: colors.backgroundSecondary }]}
                          onPress={() => a.avatar_url ? setExpandedAvatar({ url: a.avatar_url, name: a.full_name }) : null}
                          activeOpacity={a.avatar_url ? 0.7 : 1}
                        >
                          {a.avatar_url ? (
                            <Image source={{ uri: a.avatar_url }} style={styles.attendeeAvatarImg} />
                          ) : (
                            <Text style={[styles.attendeeInitial, { color: colors.textSecondary }]}>
                              {a.full_name.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <Text style={[styles.attendeeName, { color: colors.textSecondary }]}>
                          {a.full_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Expanded Avatar Overlay */}
            {expandedAvatar && (
              <TouchableOpacity
                style={styles.avatarOverlay}
                activeOpacity={1}
                onPress={() => setExpandedAvatar(null)}
              >
                <View style={styles.avatarExpanded}>
                  <Image
                    source={{ uri: expandedAvatar.url }}
                    style={styles.avatarExpandedImg}
                  />
                  <Text style={styles.avatarExpandedName}>
                    {expandedAvatar.name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: 8,
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  weekContainer: {
    padding: 8,
    gap: 8,
  },
  dayContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  weatherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weatherTemp: {
    fontSize: 12,
    fontWeight: "500",
  },
  addDayButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  trainingsContainer: {
    gap: 8,
  },
  trainingItem: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  trainingName: {
    fontSize: 14,
    fontWeight: "600",
  },
  trainingTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trainingType: {
    fontSize: 12,
  },
  attendeeCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendeeCountText: {
    fontSize: 11,
    fontWeight: "500",
  },
  timeSlotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notGoingSlot: {
    marginLeft: 4,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noTraining: {
    fontSize: 14,
    fontStyle: "italic",
  },
  indicatorsContainer: {
    marginTop: 8,
    gap: 4,
  },
  indicatorsSeparator: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicatorText: {
    fontSize: 12,
  },
  indicatorCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  attendeesOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  attendeesContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  attendeesHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  attendeesHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  attendeesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  attendeesScroll: {
    flexGrow: 0,
  },
  attendeesSlotSection: {
    marginBottom: 16,
  },
  attendeesSlotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  attendeesSlotLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  attendeesSlotCount: {
    fontSize: 13,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  attendeeAvatarImg: {
    width: 32,
    height: 32,
  },
  attendeeInitial: {
    fontSize: 14,
    fontWeight: "600",
  },
  attendeeName: {
    fontSize: 15,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  avatarExpanded: {
    alignItems: "center",
    gap: 16,
  },
  avatarExpandedImg: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  avatarExpandedName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
