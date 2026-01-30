import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Linking, Modal } from "react-native";
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useCallback, useState } from "react";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/Colors";
import { hapticSelection } from "@/lib/haptics";
import {
  useTrainingPolls,
  useRespondToPoll,
  useAttendanceStreak,
  formatTimeSlot,
  getTrainingTypeLabel,
  getTrainingTypeColor,
  type TrainingPoll,
  type AttendeeInfo,
} from "@/hooks/useTrainings";
import { useUpcomingRaces, formatRaceLocation, formatRaceDistances, type Race } from "@/hooks/useRaces";
import { useWeekWeather, getWeatherForSlot, type SlotWeather } from "@/hooks/useWeather";
import { useAnnouncements, type Announcement } from "@/hooks/useAnnouncements";

function formatRelativeDate(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d", { locale: es });
}

function formatAnnouncementDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const minutesAgo = differenceInMinutes(now, date);
  const hoursAgo = differenceInHours(now, date);
  const daysAgo = differenceInDays(now, date);

  if (minutesAgo < 60) {
    return minutesAgo <= 1 ? "Hace 1 minuto" : `Hace ${minutesAgo} minutos`;
  }
  if (hoursAgo < 24) {
    return hoursAgo === 1 ? "Hace 1 hora" : `Hace ${hoursAgo} horas`;
  }
  if (isYesterday(date)) {
    return "Ayer";
  }
  if (daysAgo < 7) {
    return daysAgo === 1 ? "Hace 1 día" : `Hace ${daysAgo} días`;
  }
  return format(date, "dd MMM", { locale: es });
}

function AnnouncementCard({ announcement, colors, expanded, onToggle }: { announcement: Announcement; colors: typeof Colors.dark; expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onToggle} style={[styles.announcementCard, { backgroundColor: colors.card }]}>
      <View style={styles.announcementHeader}>
        {announcement.pinned && <FontAwesome name="thumb-tack" size={14} color={colors.tint} style={styles.pinIcon} />}
        <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={expanded ? undefined : 2}>
          {announcement.title}
        </Text>
      </View>
      <Text style={[styles.announcementContent, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 3}>
        {announcement.content}
      </Text>
      {announcement.image_url && <Image source={{ uri: announcement.image_url }} style={styles.announcementImage} resizeMode="cover" />}
      <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>{formatAnnouncementDate(announcement.published_at)}</Text>
    </TouchableOpacity>
  );
}

function RacePreviewCard({ race, colors }: { race: Race; colors: typeof Colors.dark }) {
  const date = new Date(race.rac_Date);
  const distances = formatRaceDistances(race);

  const handlePress = () => {
    if (race.rac_SourceLink) {
      Linking.openURL(race.rac_SourceLink);
    }
  };

  return (
    <TouchableOpacity style={[styles.racePreviewCard, { backgroundColor: colors.card }]} onPress={handlePress} disabled={!race.rac_SourceLink} activeOpacity={0.7}>
      <View style={styles.racePreviewDate}>
        <Text style={[styles.racePreviewDay, { color: colors.tint }]}>{format(date, "d")}</Text>
        <Text style={[styles.racePreviewMonth, { color: colors.textSecondary }]}>{format(date, "MMM", { locale: es })}</Text>
      </View>
      <View style={styles.racePreviewInfo}>
        <Text style={[styles.racePreviewName, { color: colors.text }]} numberOfLines={1}>
          {race.rac_Name}
        </Text>
        <Text style={[styles.racePreviewLocation, { color: colors.textSecondary }]} numberOfLines={1}>
          {formatRaceLocation(race)}
        </Text>
      </View>
      {distances !== "-" && <Text style={[styles.racePreviewDistances, { color: colors.textSecondary }]}>{distances}</Text>}
    </TouchableOpacity>
  );
}

type PollCardProps = {
  poll: TrainingPoll;
  colors: typeof Colors.light;
  onVote: (timeSlot: string | null, status: "confirmed" | "not_going") => void;
  isVoting: boolean;
  weather: SlotWeather | null;
};

function AttendeeList({ attendees, colors, isSelected, label }: { attendees: AttendeeInfo[]; colors: typeof Colors.light; isSelected?: boolean; label?: string }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeInfo | null>(null);
  const MAX_AVATARS = 6;

  if (attendees.length === 0) return null;

  const visible = attendees.slice(0, MAX_AVATARS);
  const remaining = attendees.length - MAX_AVATARS;

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setModalVisible(true)} style={styles.attendeeList}>
        <View style={styles.attendeeStackRow}>
          {visible.map((attendee, index) => (
            <View
              key={attendee.id}
              style={[
                styles.attendeeAvatar,
                styles.attendeeStacked,
                {
                  backgroundColor: isSelected ? "rgba(0,0,0,0.2)" : colors.backgroundSecondary,
                  marginLeft: index === 0 ? 0 : -10,
                  zIndex: attendees.length - index,
                  borderColor: isSelected ? colors.tint : colors.card,
                },
              ]}
            >
              {attendee.avatar_url ? (
                <Image source={{ uri: attendee.avatar_url }} style={styles.attendeeAvatarImage} />
              ) : (
                <Text style={[styles.attendeeInitial, { color: isSelected ? "#fff" : colors.tint }]}>{attendee.full_name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          ))}
          {remaining > 0 && (
            <View
              style={[
                styles.attendeeAvatar,
                styles.attendeeStacked,
                {
                  marginLeft: -10,
                  backgroundColor: isSelected ? "rgba(0,0,0,0.3)" : colors.backgroundSecondary,
                  borderColor: isSelected ? colors.tint : colors.card,
                },
              ]}
            >
              <Text style={[styles.attendeeInitial, { color: isSelected ? "#fff" : colors.textSecondary }]}>+{remaining}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.attendeeModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setModalVisible(false);
            setSelectedAttendee(null);
          }}
        >
          <View style={[styles.attendeeModalContent, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.attendeeModalHandle}>
              <View style={[styles.attendeeModalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {selectedAttendee ? (
              <View style={styles.avatarPreviewContainer}>
                <TouchableOpacity onPress={() => setSelectedAttendee(null)} style={styles.avatarPreviewBack}>
                  <FontAwesome name="arrow-left" size={18} color={colors.text} />
                </TouchableOpacity>
                {selectedAttendee.avatar_url && <Image source={{ uri: selectedAttendee.avatar_url }} style={styles.avatarPreviewImage} />}
                <Text style={[styles.avatarPreviewName, { color: colors.text }]}>{selectedAttendee.full_name}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.attendeeModalTitle, { color: colors.text }]}>
                  {label ?? "Asistentes"} ({attendees.length})
                </Text>
                <ScrollView style={styles.attendeeModalList}>
                  {attendees.map((attendee) => (
                    <TouchableOpacity
                      key={attendee.id}
                      style={styles.attendeeModalItem}
                      activeOpacity={0.7}
                      onPress={() => (attendee.avatar_url ? setSelectedAttendee(attendee) : undefined)}
                      disabled={!attendee.avatar_url}
                    >
                      <View style={[styles.attendeeModalAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                        {attendee.avatar_url ? (
                          <Image source={{ uri: attendee.avatar_url }} style={styles.attendeeModalAvatarImage} />
                        ) : (
                          <Text style={[styles.attendeeModalInitial, { color: colors.tint }]}>{attendee.full_name.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={[styles.attendeeModalName, { color: colors.text }]}>{attendee.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function PollCard({ poll, colors, onVote, isVoting, weather }: PollCardProps) {
  const typeColor = getTrainingTypeColor(poll.type);
  const userVotedFor = poll.userResponse.timeSlot;
  const userStatus = poll.userResponse.status;
  const hasVoted = userStatus !== null;
  const [collapsed, setCollapsed] = useState(hasVoted);

  // Summary text when collapsed
  const collapsedSummary = () => {
    if (userStatus === "confirmed" && userVotedFor) {
      return `${formatTimeSlot(userVotedFor)} · ${poll.totalResponses} ${poll.totalResponses === 1 ? "respuesta" : "respuestas"}`;
    }
    if (userStatus === "not_going") {
      return `No voy · ${poll.totalResponses} ${poll.totalResponses === 1 ? "respuesta" : "respuestas"}`;
    }
    return null;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setCollapsed((c) => !c)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.typeBadgeText}>{getTrainingTypeLabel(poll.type)}</Text>
            </View>
            <View style={styles.cardTitleRowRight}>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{formatRelativeDate(poll.date)}</Text>
              <FontAwesome name={collapsed ? "chevron-down" : "chevron-up"} size={12} color={colors.textSecondary} />
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{poll.name}</Text>
          <View style={styles.locationWeatherRow}>
            {poll.location && (
              <View style={styles.locationRow}>
                <FontAwesome name="map-marker" size={14} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>{poll.location}</Text>
              </View>
            )}
            {weather && (
              <View style={styles.weatherRow}>
                <FontAwesome name={weather.info.icon} size={14} color={weather.info.color} />
                <Text style={[styles.weatherTemp, { color: colors.text }]}>{weather.temperature}°</Text>
                {weather.precipitationProbability > 20 && (
                  <>
                    <FontAwesome name="tint" size={12} color="#60A5FA" />
                    <Text style={[styles.weatherRain, { color: "#60A5FA" }]}>{weather.precipitationProbability}%</Text>
                  </>
                )}
              </View>
            )}
          </View>
          {collapsed && collapsedSummary() && (
            <View style={styles.collapsedSummaryRow}>
              {userStatus === "confirmed" && <FontAwesome name="check-circle" size={14} color={colors.tint} />}
              {userStatus === "not_going" && <FontAwesome name="times-circle" size={14} color={colors.error} />}
              <Text style={[styles.collapsedSummaryText, { color: colors.textSecondary }]}>{collapsedSummary()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.pollContent}>
          <Text style={[styles.pollQuestion, { color: colors.text }]}>¿Vas a entrenar?</Text>

          {/* Time slot options */}
          <View style={styles.pollOptions}>
            {poll.time_slots.map((slot) => {
              const isSelected = userStatus === "confirmed" && userVotedFor === slot;
              const attendeesForSlot = poll.attendees[slot] || [];
              const count = attendeesForSlot.length;

              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.pollOption,
                    {
                      backgroundColor: isSelected ? colors.tint : colors.backgroundSecondary,
                      borderColor: isSelected ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => onVote(slot, "confirmed")}
                  disabled={isVoting}
                >
                  <View style={styles.pollOptionHeader}>
                    <View style={styles.pollOptionLeft}>
                      {isSelected && <FontAwesome name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} />}
                      <Text style={[styles.pollOptionText, { color: isSelected ? "#fff" : colors.text }]}>{formatTimeSlot(slot)}</Text>
                    </View>
                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.countText, { color: isSelected ? "#fff" : colors.text }]}>{count}</Text>
                    </View>
                  </View>

                  {count > 0 && <AttendeeList attendees={attendeesForSlot} colors={colors} isSelected={isSelected} />}
                </TouchableOpacity>
              );
            })}

            {/* "No voy" option */}
            {(() => {
              const isNotGoingSelected = userStatus === "not_going";
              const notGoingCount = poll.notGoing.length;

              return (
                <TouchableOpacity
                  style={[
                    styles.pollOption,
                    styles.notGoingOption,
                    {
                      backgroundColor: isNotGoingSelected ? colors.error : colors.backgroundSecondary,
                      borderColor: isNotGoingSelected ? colors.error : colors.border,
                    },
                  ]}
                  onPress={() => onVote(null, "not_going")}
                  disabled={isVoting}
                >
                  <View style={styles.pollOptionHeader}>
                    <View style={styles.pollOptionLeft}>
                      {isNotGoingSelected && <FontAwesome name="times-circle" size={18} color="#fff" style={{ marginRight: 8 }} />}
                      <Text style={[styles.pollOptionText, { color: isNotGoingSelected ? "#fff" : colors.text }]}>No voy</Text>
                    </View>
                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor: isNotGoingSelected ? "rgba(255,255,255,0.2)" : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.countText, { color: isNotGoingSelected ? "#fff" : colors.text }]}>{notGoingCount}</Text>
                    </View>
                  </View>

                  {notGoingCount > 0 && <AttendeeList attendees={poll.notGoing} colors={colors} isSelected={isNotGoingSelected} />}
                </TouchableOpacity>
              );
            })()}
          </View>

          {poll.totalResponses > 0 && (
            <Text style={[styles.totalVotes, { color: colors.textSecondary }]}>
              {poll.totalResponses} {poll.totalResponses === 1 ? "respuesta" : "respuestas"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { profile } = useAuth();
  const { data: announcements, refetch: refetchAnnouncements } = useAnnouncements();
  const { data: polls, isLoading, refetch: refetchPolls, isRefetching } = useTrainingPolls();
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());

  const toggleAnnouncement = useCallback((id: string) => {
    setExpandedAnnouncements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    refetchPolls();
    refetchAnnouncements();
  }, [refetchPolls, refetchAnnouncements]);
  const { data: streak } = useAttendanceStreak();
  const { data: upcomingRaces } = useUpcomingRaces(3);
  const { data: weatherData } = useWeekWeather();
  const respondToPoll = useRespondToPoll();

  const handleVote = (poll: TrainingPoll, timeSlot: string | null, status: "confirmed" | "not_going") => {
    hapticSelection();
    respondToPoll.mutate({
      trainingId: poll.id,
      date: format(poll.date, "yyyy-MM-dd"),
      timeSlot,
      status,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.tint} />}
      >
        {announcements && announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Anuncios</Text>
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                colors={colors}
                expanded={expandedAnnouncements.has(announcement.id)}
                onToggle={() => toggleAnnouncement(announcement.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Esta semana</Text>
            {streak !== undefined && (
              <TouchableOpacity
                style={[styles.streakBadge, { backgroundColor: colors.card }]}
                onPress={() => router.push("/(tabs)/stats")}
                activeOpacity={0.7}
              >
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={[styles.streakNumber, { color: colors.text }]}>{streak}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : polls && polls.length > 0 ? (
            polls.map((poll) => (
              <PollCard
                key={`${poll.id}-${poll.date.toISOString()}`}
                poll={poll}
                colors={colors}
                onVote={(timeSlot, status) => handleVote(poll, timeSlot, status)}
                isVoting={respondToPoll.isPending}
                weather={getWeatherForSlot(weatherData, poll.date, poll.time_slots)}
              />
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <FontAwesome name="calendar-o" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay entrenamientos próximos</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Los entrenamientos de esta semana aparecerán aquí</Text>
            </View>
          )}
        </View>

        {/* Upcoming Races Section */}
        {upcomingRaces && upcomingRaces.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: colors.text }]}>Próximas carreras</Text>
              <TouchableOpacity onPress={() => router.push("/races")}>
                <Text style={[styles.seeAllLink, { color: colors.tint }]}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.racesPreviewList}>
              {upcomingRaces.map((race) => (
                <RacePreviewCard key={race.id} race={race} colors={colors} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          const phone = process.env.EXPO_PUBLIC_COACH_PHONE;
          if (phone) {
            Linking.openURL(`https://wa.me/${phone}`);
          }
        }}
        activeOpacity={0.8}
      >
        <FontAwesome name="whatsapp" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
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
    marginBottom: 24,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  greeting: {
    fontSize: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  streakFire: {
    fontSize: 14,
  },
  streakNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  collapsedSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  collapsedSummaryText: {
    fontSize: 13,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  locationWeatherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 14,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: "600",
  },
  weatherRain: {
    fontSize: 12,
    fontWeight: "500",
  },
  pollContent: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 16,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  pollOptions: {
    gap: 8,
  },
  pollOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pollOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pollOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pollOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center",
  },
  countText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notGoingOption: {
    marginTop: 4,
  },
  attendeeList: {
    marginTop: 10,
  },
  attendeeStackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  attendeeStacked: {
    borderWidth: 2,
  },
  attendeeAvatarImage: {
    width: 28,
    height: 28,
  },
  attendeeInitial: {
    fontSize: 12,
    fontWeight: "600",
  },
  attendeeModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  attendeeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  attendeeModalHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  attendeeModalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  attendeeModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  attendeeModalList: {
    flexGrow: 0,
  },
  attendeeModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  attendeeModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  attendeeModalAvatarImage: {
    width: 40,
    height: 40,
  },
  attendeeModalInitial: {
    fontSize: 16,
    fontWeight: "600",
  },
  attendeeModalName: {
    fontSize: 16,
  },
  avatarPreviewContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 16,
  },
  avatarPreviewBack: {
    alignSelf: "flex-start",
    padding: 4,
  },
  avatarPreviewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  avatarPreviewName: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalVotes: {
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyState: {
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  racesPreviewList: {
    gap: 8,
  },
  racePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  racePreviewDate: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 40,
  },
  racePreviewDay: {
    fontSize: 18,
    fontWeight: "bold",
  },
  racePreviewMonth: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  racePreviewInfo: {
    flex: 1,
  },
  racePreviewName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  racePreviewLocation: {
    fontSize: 13,
  },
  racePreviewDistances: {
    fontSize: 12,
    marginLeft: 8,
    textAlign: "right",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  announcementCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pinIcon: {
    marginRight: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  announcementContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 12,
  },
});
