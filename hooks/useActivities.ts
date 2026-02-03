import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  format,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  eachMonthOfInterval,
  min as dateMin,
  max as dateMax,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Activity } from "@/types/database";

export type KmBreakdownItem = { label: string; km: number };

export function useActivities(month?: Date) {
  const { user } = useAuth();
  const targetMonth = month ?? new Date();

  return useQuery({
    queryKey: [
      "activities",
      user?.id,
      format(targetMonth, "yyyy-MM"),
    ],
    queryFn: async () => {
      const start = format(startOfMonth(targetMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(targetMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });
}

export function useRecentActivities(limit: number = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activities", "recent", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });
}

export function useActivityStats(month?: Date) {
  const { user } = useAuth();
  const targetMonth = month ?? new Date();

  return useQuery({
    queryKey: [
      "activity-stats",
      user?.id,
      format(targetMonth, "yyyy-MM"),
    ],
    queryFn: async () => {
      const start = format(startOfMonth(targetMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(targetMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("activities")
        .select("distance_km, duration_seconds, avg_pace_seconds")
        .eq("user_id", user!.id)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;

      const activities = data ?? [];
      const totalKm = activities.reduce(
        (sum, a) => sum + (a.distance_km ?? 0),
        0
      );
      const totalSeconds = activities.reduce(
        (sum, a) => sum + (a.duration_seconds ?? 0),
        0
      );
      const totalActivities = activities.length;

      // Calculate average pace (only from activities that have pace)
      const activitiesWithPace = activities.filter((a) => a.avg_pace_seconds);
      const avgPace =
        activitiesWithPace.length > 0
          ? activitiesWithPace.reduce(
              (sum, a) => sum + (a.avg_pace_seconds ?? 0),
              0
            ) / activitiesWithPace.length
          : null;

      return {
        totalKm: Math.round(totalKm * 10) / 10,
        totalMinutes: Math.round(totalSeconds / 60),
        totalActivities,
        avgPaceSeconds: avgPace ? Math.round(avgPace) : null,
      };
    },
    enabled: !!user,
  });
}

export function useActivitiesByRange(startDate: Date, endDate: Date) {
  const { user } = useAuth();
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["activities", user?.id, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });
}

export function useActivityStatsByRange(startDate: Date, endDate: Date) {
  const { user } = useAuth();
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["activity-stats", user?.id, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("distance_km, duration_seconds, avg_pace_seconds")
        .eq("user_id", user!.id)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;

      const activities = data ?? [];
      const totalKm = activities.reduce(
        (sum, a) => sum + (a.distance_km ?? 0),
        0
      );
      const totalSeconds = activities.reduce(
        (sum, a) => sum + (a.duration_seconds ?? 0),
        0
      );
      const totalActivities = activities.length;

      const activitiesWithPace = activities.filter((a) => a.avg_pace_seconds);
      const avgPace =
        activitiesWithPace.length > 0
          ? activitiesWithPace.reduce(
              (sum, a) => sum + (a.avg_pace_seconds ?? 0),
              0
            ) / activitiesWithPace.length
          : null;

      return {
        totalKm: Math.round(totalKm * 10) / 10,
        totalMinutes: Math.round(totalSeconds / 60),
        totalActivities,
        avgPaceSeconds: avgPace ? Math.round(avgPace) : null,
      };
    },
    enabled: !!user,
  });
}

export function useAddActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      date: string;
      distance_km?: number;
      duration_seconds?: number;
      title?: string;
      notes?: string;
      activity_type?: string;
      avg_heart_rate?: number;
      max_heart_rate?: number;
    }) => {
      // Calculate pace if we have both distance and duration
      let avg_pace_seconds: number | null = null;
      if (activity.distance_km && activity.duration_seconds) {
        avg_pace_seconds = Math.round(
          activity.duration_seconds / activity.distance_km
        );
      }

      const { data, error } = await supabase
        .from("activities")
        .insert({
          user_id: user!.id,
          source: "manual",
          activity_type: activity.activity_type ?? "running",
          date: activity.date,
          distance_km: activity.distance_km,
          duration_seconds: activity.duration_seconds,
          avg_pace_seconds,
          avg_heart_rate: activity.avg_heart_rate ?? null,
          max_heart_rate: activity.max_heart_rate ?? null,
          title: activity.title,
          notes: activity.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      queryClient.invalidateQueries({ queryKey: ["badge-stats"] });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...activity
    }: {
      id: string;
      date?: string;
      distance_km?: number;
      duration_seconds?: number;
      title?: string;
      notes?: string;
      avg_heart_rate?: number;
      max_heart_rate?: number;
    }) => {
      // Calculate pace if we have both distance and duration
      let avg_pace_seconds: number | null = null;
      if (activity.distance_km && activity.duration_seconds) {
        avg_pace_seconds = Math.round(
          activity.duration_seconds / activity.distance_km
        );
      }

      const { data, error } = await supabase
        .from("activities")
        .update({
          date: activity.date,
          distance_km: activity.distance_km,
          duration_seconds: activity.duration_seconds,
          avg_pace_seconds,
          avg_heart_rate: activity.avg_heart_rate ?? null,
          max_heart_rate: activity.max_heart_rate ?? null,
          title: activity.title,
          notes: activity.notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      queryClient.invalidateQueries({ queryKey: ["badge-stats"] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      queryClient.invalidateQueries({ queryKey: ["badge-stats"] });
    },
  });
}

export function useWeeklyKmBreakdown(
  period: "month" | "year" | "lifetime",
  startDate: Date,
  endDate: Date
) {
  const { user } = useAuth();
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["km-breakdown", user?.id, period, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("date, distance_km")
        .eq("user_id", user!.id)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;

      const activities = data ?? [];

      if (period === "month") {
        // Group by week (Mon-Sun)
        const weeks = eachWeekOfInterval(
          { start: startDate, end: endDate },
          { weekStartsOn: 1 }
        );
        return weeks.map((weekStart, i) => {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const km = activities
            .filter((a) => {
              const d = new Date(a.date);
              return d >= weekStart && d <= weekEnd;
            })
            .reduce((sum, a) => sum + (a.distance_km ?? 0), 0);
          return {
            label: `S${i + 1}`,
            km: Math.round(km * 10) / 10,
          };
        });
      }

      if (period === "year") {
        // Group by month
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        return months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const km = activities
            .filter((a) => {
              const d = new Date(a.date);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, a) => sum + (a.distance_km ?? 0), 0);
          return {
            label: format(monthStart, "MMM").slice(0, 3),
            km: Math.round(km * 10) / 10,
          };
        });
      }

      // lifetime: last 6 months
      const now = new Date();
      const sixMonthsAgo = subMonths(startOfMonth(now), 5);
      const recentMonths = eachMonthOfInterval({
        start: sixMonthsAgo,
        end: now,
      });
      return recentMonths.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const km = activities
          .filter((a) => {
            const d = new Date(a.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((sum, a) => sum + (a.distance_km ?? 0), 0);
        return {
          label: format(monthStart, "MMM").slice(0, 3),
          km: Math.round(km * 10) / 10,
        };
      });
    },
    enabled: !!user,
  });
}

// Helper functions
export function formatPace(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} min`;
}

export function formatDistance(km: number | null): string {
  if (!km) return "-";
  return `${km.toFixed(1)} km`;
}
