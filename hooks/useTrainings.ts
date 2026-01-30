import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  subDays,
  isSameDay,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type {
  Training,
  TrainingSession,
  Attendance,
  Profile,
} from "@/types/database";

export type AttendeeInfo = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  time_slot: string;
  status: Attendance["status"];
};

export type TrainingPoll = Training & {
  date: Date;
  attendees: {
    [timeSlot: string]: AttendeeInfo[];
  };
  notGoing: AttendeeInfo[];
  userResponse: {
    status: "confirmed" | "not_going" | null;
    timeSlot: string | null;
    attendanceId: string | null;
  };
  totalResponses: number;
};

export type TrainingWithSession = Training & {
  session: TrainingSession | null;
  userAttendance: Attendance | null;
  attendeeCount: number;
  attendeesBySlot: { [slot: string]: AttendeeInfo[] };
  notGoing: AttendeeInfo[];
};

// Hook for poll-style view with attendee names
export function useTrainingPolls() {
  const { user } = useAuth();
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = endOfWeek(today, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["trainings", "polls", format(start, "yyyy-MM-dd")],
    queryFn: async (): Promise<TrainingPoll[]> => {
      // Get all active trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings")
        .select("*")
        .eq("is_active", true)
        .order("day_of_week");

      if (trainingsError) throw trainingsError;

      // Get sessions for this week
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      if (sessionsError) throw sessionsError;

      // Get all attendances with profile info for this week's sessions
      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      let allAttendances: (Attendance & { profiles: Profile })[] = [];

      if (sessionIds.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendances")
          .select("*, profiles(*)")
          .in("session_id", sessionIds);

        if (attendanceError) throw attendanceError;
        allAttendances = (attendanceData ?? []) as any;
      }

      // Build poll data for each training
      const polls: TrainingPoll[] = [];

      for (const training of (trainings ?? []) as Training[]) {
        const trainingDate = addDays(
          start,
          training.day_of_week === 0 ? 6 : training.day_of_week - 1
        );

        // Find ALL sessions for this training on this date (there may be multiple per time slot)
        const trainingSessions = (sessions ?? []).filter(
          (s: any) =>
            s.training_id === training.id &&
            isSameDay(parseISO(s.date), trainingDate)
        ) as TrainingSession[];

        // Get attendances for ALL these sessions
        const sessionAttendances = allAttendances.filter((a) =>
          trainingSessions.some((s) => s.id === a.session_id)
        );

        // Group attendees by time slot
        const attendeesBySlot: { [slot: string]: AttendeeInfo[] } = {};
        const notGoing: AttendeeInfo[] = [];

        for (const slot of training.time_slots) {
          attendeesBySlot[slot] = [];
        }

        for (const att of sessionAttendances) {
          const profile = (att as any).profiles as Profile;
          const info: AttendeeInfo = {
            id: att.user_id,
            full_name: profile?.full_name ?? "Usuario",
            avatar_url: profile?.avatar_url ?? null,
            time_slot: att.time_slot,
            status: att.status,
          };

          if (att.status === "not_going") {
            notGoing.push(info);
          } else if (att.status === "confirmed" || att.status === "attended") {
            if (attendeesBySlot[att.time_slot]) {
              attendeesBySlot[att.time_slot].push(info);
            }
          }
        }

        // Find user's response (across all sessions for this training/date)
        const userAttendance = user
          ? sessionAttendances.find((a) => a.user_id === user.id)
          : null;

        polls.push({
          ...training,
          date: trainingDate,
          attendees: attendeesBySlot,
          notGoing,
          userResponse: {
            status: userAttendance
              ? userAttendance.status === "not_going"
                ? "not_going"
                : "confirmed"
              : null,
            timeSlot: userAttendance?.time_slot ?? null,
            attendanceId: userAttendance?.id ?? null,
          },
          totalResponses:
            Object.values(attendeesBySlot).reduce(
              (sum, arr) => sum + arr.length,
              0
            ) + notGoing.length,
        });
      }

      // Sort by date, then filter to show only today and future
      return polls
        .filter(
          (p) => p.date >= today || isSameDay(p.date, today)
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    enabled: !!user,
  });
}

// Mutation to respond to poll (confirm attendance or mark not going)
export function useRespondToPoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      trainingId,
      date,
      timeSlot,
      status,
    }: {
      trainingId: string;
      date: string;
      timeSlot: string | null; // null for "not_going"
      status: "confirmed" | "not_going";
    }) => {
      if (!user) throw new Error("User not authenticated");

      // For "not_going", we use a special time_slot value
      const effectiveTimeSlot = timeSlot ?? "not_going";

      // First, get or create the session
      const { data: existingSession, error: sessionError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("training_id", trainingId)
        .eq("date", date)
        .eq("time_slot", effectiveTimeSlot)
        .single();

      let session = existingSession;

      if (sessionError && sessionError.code === "PGRST116") {
        // Session doesn't exist, create it
        const { data: newSession, error: createError } = await supabase
          .from("training_sessions")
          .insert({
            training_id: trainingId,
            date,
            time_slot: effectiveTimeSlot,
          })
          .select()
          .single();

        if (createError) throw createError;
        session = newSession;
      } else if (sessionError) {
        throw sessionError;
      }

      // Delete any existing attendance for this user on this training/date
      // (in case they're changing their response)
      const { data: existingSessions } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("training_id", trainingId)
        .eq("date", date);

      if (existingSessions && existingSessions.length > 0) {
        await supabase
          .from("attendances")
          .delete()
          .eq("user_id", user.id)
          .in(
            "session_id",
            existingSessions.map((s: any) => s.id)
          );
      }

      // Create new attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendances")
        .insert({
          session_id: session!.id,
          user_id: user.id,
          time_slot: effectiveTimeSlot,
          status: status === "not_going" ? "not_going" : "confirmed",
        })
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      return attendance as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
  });
}

export function useWeeklyTrainings(weekStart?: Date) {
  const { user } = useAuth();
  const start = weekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["trainings", "weekly", format(start, "yyyy-MM-dd")],
    queryFn: async (): Promise<TrainingWithSession[]> => {
      // Get all active trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings")
        .select("*")
        .eq("is_active", true)
        .order("day_of_week");

      if (trainingsError) throw trainingsError;

      // Get sessions for this week
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      if (sessionsError) throw sessionsError;

      // Get user's attendances for this week's sessions
      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      let attendances: Attendance[] = [];

      if (sessionIds.length > 0 && user) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendances")
          .select("*")
          .in("session_id", sessionIds)
          .eq("user_id", user.id);

        if (attendanceError) throw attendanceError;
        attendances = (attendanceData ?? []) as Attendance[];
      }

      // Get all attendances with profile info for this week's sessions
      let allAttendances: (Attendance & { profiles: Pick<Profile, "full_name" | "avatar_url"> })[] = [];
      if (sessionIds.length > 0) {
        const { data: allAttData, error: allAttError } = await supabase
          .from("attendances")
          .select("*, profiles(full_name, avatar_url)")
          .in("session_id", sessionIds);

        if (!allAttError && allAttData) {
          allAttendances = allAttData as any;
        }
      }

      // Build attendance counts from the full data
      const attendanceCounts: Record<string, number> = {};
      for (const att of allAttendances) {
        if (att.status === "confirmed") {
          attendanceCounts[att.session_id] = (attendanceCounts[att.session_id] || 0) + 1;
        }
      }

      // Map trainings with their sessions for this week
      const result: TrainingWithSession[] = [];

      for (const training of (trainings ?? []) as Training[]) {
        // Find the date for this training in the current week
        const trainingDate = addDays(
          start,
          training.day_of_week === 0 ? 6 : training.day_of_week - 1
        );

        // Find ALL sessions for this training on this date (there may be multiple per time slot)
        const trainingSessions = (sessions ?? []).filter(
          (s: any) =>
            s.training_id === training.id &&
            isSameDay(parseISO(s.date), trainingDate)
        ) as TrainingSession[];

        // Find user's attendance across all sessions for this training/date
        const userAttendance = attendances.find((a) =>
          trainingSessions.some((s) => s.id === a.session_id)
        ) ?? null;

        // Sum attendance counts across all sessions
        const attendeeCount = trainingSessions.reduce(
          (sum, s) => sum + (attendanceCounts[s.id] ?? 0),
          0
        );

        // Build attendees by slot and not-going list
        const attendeesBySlot: { [slot: string]: AttendeeInfo[] } = {};
        for (const slot of training.time_slots) {
          attendeesBySlot[slot] = [];
        }
        const notGoing: AttendeeInfo[] = [];

        const trainingSessionIds = new Set(trainingSessions.map((s) => s.id));
        for (const att of allAttendances) {
          if (!trainingSessionIds.has(att.session_id)) continue;
          const profile = (att as any).profiles;
          if (!profile) continue;
          const info: AttendeeInfo = {
            id: att.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            time_slot: att.time_slot,
            status: att.status,
          };
          if (att.status === "not_going") {
            notGoing.push(info);
          } else if (att.status === "confirmed" && attendeesBySlot[att.time_slot]) {
            attendeesBySlot[att.time_slot].push(info);
          }
        }

        // Use first session for compatibility (or null if none)
        const session = trainingSessions[0] ?? null;

        result.push({
          ...training,
          session,
          userAttendance,
          attendeeCount,
          attendeesBySlot,
          notGoing,
        });
      }

      return result;
    },
    enabled: !!user,
  });
}

export function useUpcomingTrainings() {
  const { user } = useAuth();
  const today = new Date();
  const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["trainings", "upcoming"],
    queryFn: async () => {
      // Get all active trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings")
        .select("*")
        .eq("is_active", true)
        .order("day_of_week");

      if (trainingsError) throw trainingsError;

      // Get sessions from today to end of week
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .gte("date", format(today, "yyyy-MM-dd"))
        .lte("date", format(endOfCurrentWeek, "yyyy-MM-dd"))
        .eq("cancelled", false);

      if (sessionsError) throw sessionsError;

      // Get user's attendances
      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      let attendances: Attendance[] = [];

      if (sessionIds.length > 0 && user) {
        const { data: attendanceData } = await supabase
          .from("attendances")
          .select("*")
          .in("session_id", sessionIds)
          .eq("user_id", user.id);

        attendances = (attendanceData ?? []) as Attendance[];
      }

      // Build upcoming trainings list
      const upcoming: (TrainingWithSession & { date: Date })[] = [];

      for (const training of (trainings ?? []) as Training[]) {
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const trainingDate = addDays(
          start,
          training.day_of_week === 0 ? 6 : training.day_of_week - 1
        );

        // Skip if training day has passed
        if (trainingDate < today && !isSameDay(trainingDate, today)) continue;

        // Find ALL sessions for this training on this date
        const trainingSessions = (sessions ?? []).filter(
          (s: any) =>
            s.training_id === training.id &&
            isSameDay(parseISO(s.date), trainingDate)
        ) as TrainingSession[];

        // Find user's attendance across all sessions
        const userAttendance = attendances.find((a) =>
          trainingSessions.some((s) => s.id === a.session_id)
        ) ?? null;

        // Use first session for compatibility
        const session = trainingSessions[0] ?? null;

        upcoming.push({
          ...training,
          session,
          userAttendance,
          attendeeCount: 0,
          attendeesBySlot: {},
          notGoing: [],
          date: trainingDate,
        });
      }

      // Sort by date
      return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    enabled: !!user,
  });
}

export function useConfirmAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      trainingId,
      date,
      timeSlot,
    }: {
      trainingId: string;
      date: string;
      timeSlot: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // First, get or create the session
      const { data: existingSession, error: sessionError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("training_id", trainingId)
        .eq("date", date)
        .eq("time_slot", timeSlot)
        .single();

      let session = existingSession;

      if (sessionError && sessionError.code === "PGRST116") {
        // Session doesn't exist, create it
        const { data: newSession, error: createError } = await supabase
          .from("training_sessions")
          .insert({
            training_id: trainingId,
            date,
            time_slot: timeSlot,
          })
          .select()
          .single();

        if (createError) throw createError;
        session = newSession;
      } else if (sessionError) {
        throw sessionError;
      }

      // Now create or update attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendances")
        .upsert(
          {
            session_id: session!.id,
            user_id: user.id,
            time_slot: timeSlot,
            status: "confirmed",
          },
          {
            onConflict: "session_id,user_id",
          }
        )
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      return attendance as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
  });
}

export function useCancelAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase
        .from("attendances")
        .update({ status: "cancelled" })
        .eq("id", attendanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
  });
}

// Helper to format training day
export function formatTrainingDay(dayOfWeek: number): string {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return days[dayOfWeek];
}

// Helper to format time slot
export function formatTimeSlot(timeSlot: string): string {
  if (timeSlot === "not_going") return "No voy";
  const [hours, minutes] = timeSlot.split(":");
  const hour = parseInt(hours, 10);
  return `${hour}:${minutes}hs`;
}

// Helper to get training type label
export function getTrainingTypeLabel(type: Training["type"]): string {
  const labels: Record<Training["type"], string> = {
    running: "Running",
    strength: "Fuerza",
    track: "Pista",
  };
  return labels[type];
}

// Helper to get training type color
export function getTrainingTypeColor(type: Training["type"]): string {
  const colors: Record<Training["type"], string> = {
    running: "#00E676", // Neos green
    strength: "#FF9800", // Orange
    track: "#2196F3", // Blue
  };
  return colors[type];
}

// Hook to calculate attendance streak
export function useAttendanceStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["attendance", "streak", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // Get all trainings to know which days have trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings")
        .select("*")
        .eq("is_active", true);

      if (trainingsError) throw trainingsError;

      // Get all user's attendances ordered by date (most recent first)
      const { data: attendances, error: attendancesError } = await supabase
        .from("attendances")
        .select("*, training_sessions(*)")
        .eq("user_id", user.id)
        .order("confirmed_at", { ascending: false });

      if (attendancesError) throw attendancesError;

      // Build a set of days that have trainings (0-6, where 0 is Sunday)
      const trainingDays = new Set(
        (trainings ?? []).map((t: Training) => t.day_of_week)
      );

      // Build a map of dates where user attended (confirmed or attended status)
      const attendedDates = new Set<string>();
      const notGoingDates = new Set<string>();

      for (const att of (attendances ?? []) as any[]) {
        const session = att.training_sessions;
        if (!session) continue;

        const dateStr = session.date;
        if (att.status === "confirmed" || att.status === "attended") {
          attendedDates.add(dateStr);
        } else if (att.status === "not_going") {
          notGoingDates.add(dateStr);
        }
      }

      // Calculate streak: count consecutive training days (going backwards from today)
      // where user either attended or there was no training scheduled
      let streak = 0;
      const today = startOfDay(new Date());
      let currentDate = subDays(today, 1); // Start from yesterday (today isn't over yet)

      // Go back up to 365 days to find the streak
      for (let i = 0; i < 365; i++) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Check if this day had a scheduled training
        if (trainingDays.has(dayOfWeek)) {
          // Training day - check if user attended
          if (attendedDates.has(dateStr)) {
            // User attended - streak continues
            streak++;
          } else if (notGoingDates.has(dateStr)) {
            // User explicitly marked "not going" - streak breaks
            break;
          } else {
            // No response - assume they didn't go, streak breaks
            break;
          }
        }
        // If no training scheduled this day, just continue (doesn't affect streak)

        currentDate = subDays(currentDate, 1);
      }

      return streak;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
