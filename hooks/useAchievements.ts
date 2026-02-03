import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useAttendanceStreak } from "@/hooks/useTrainings";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { useUpdateProfile } from "@/hooks/useProfile";
import { BADGES, type BadgeDefinition } from "@/constants/badges";
import type { PersonalRecord } from "@/types/database";

export type BadgeStatus = {
  badge: BadgeDefinition;
  unlocked: boolean;
  current: number;
  target: number;
};

function useBadgeStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["badge-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_badge_stats", {
        user_uuid: user!.id,
      });
      if (error) throw error;
      return data as { total_km: number; total_activities: number };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

function evaluateCarrerasBadges(records: PersonalRecord[]): Map<string, boolean> {
  const result = new Map<string, boolean>();

  // first_pr: has any record
  result.set("first_pr", records.length > 0);

  // race_5k, race_10k, etc: has record with matching event_name
  const eventKeys = ["5K", "10K", "21K", "42K"];
  for (const key of eventKeys) {
    const hasRecord = records.some(
      (r) => r.event_name.toUpperCase() === key
    );
    result.set(`race_${key.toLowerCase()}`, hasRecord);
  }

  // race_official: any record with is_official = true
  result.set("race_official", records.some((r) => r.is_official));

  return result;
}

export function useAchievements() {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useBadgeStats();
  const { data: streak, isLoading: streakLoading } = useAttendanceStreak();
  const { data: records, isLoading: recordsLoading } = usePersonalRecords();
  const updateProfile = useUpdateProfile();

  const maxStreak = profile?.max_attendance_streak ?? 0;
  const currentStreak = streak ?? 0;

  // Update max streak in profile when current exceeds stored
  useEffect(() => {
    if (currentStreak > maxStreak && profile) {
      updateProfile.mutate({ max_attendance_streak: currentStreak });
    }
  }, [currentStreak, maxStreak]);

  const effectiveMaxStreak = Math.max(maxStreak, currentStreak);

  const badges = useMemo((): BadgeStatus[] => {
    const carrerasMap = evaluateCarrerasBadges(records ?? []);
    const totalKm = stats?.total_km ?? 0;

    return BADGES.map((badge) => {
      if (badge.category === "volumen") {
        const target = badge.threshold!;
        return {
          badge,
          unlocked: totalKm >= target,
          current: Math.min(Math.round(totalKm * 10) / 10, target),
          target,
        };
      }

      if (badge.category === "consistencia") {
        const target = badge.threshold!;
        return {
          badge,
          unlocked: effectiveMaxStreak >= target,
          current: Math.min(effectiveMaxStreak, target),
          target,
        };
      }

      // carreras
      const unlocked = carrerasMap.get(badge.id) ?? false;
      return {
        badge,
        unlocked,
        current: unlocked ? 1 : 0,
        target: 1,
      };
    });
  }, [stats, effectiveMaxStreak, records]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return {
    badges,
    unlockedCount,
    totalCount: BADGES.length,
    isLoading: statsLoading || streakLoading || recordsLoading,
  };
}
