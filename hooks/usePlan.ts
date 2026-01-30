import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { PersonalPlan, Json } from "@/types/database";

// Types for weekend plan
export type WeekendSession = {
  session: string;
  coach_notes?: string;
  km_total?: number;
  time_minutes?: number;
  rpe?: number;
  observations?: string;
  completed: boolean;
};

export type WeekendPlanContent = {
  weekend_date: string;
  sessions: WeekendSession[];
};

export function usePlan(weekStart: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plan", format(weekStart, "yyyy-MM-dd"), "weekend"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_plans")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", format(weekStart, "yyyy-MM-dd"))
        .eq("plan_type", "weekend")
        .maybeSingle();

      if (error) throw error;
      return data as PersonalPlan | null;
    },
    enabled: !!user,
  });
}

export function useUpdateWeekendSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      sessionIndex,
      sessionData,
      currentContent,
    }: {
      planId: string;
      sessionIndex: number;
      sessionData: Partial<WeekendSession>;
      currentContent: Json;
    }) => {
      const content = currentContent as WeekendPlanContent;
      const updatedSessions = [...content.sessions];
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        ...sessionData,
      };

      const updatedContent = {
        ...content,
        sessions: updatedSessions,
      };

      const { error } = await supabase
        .from("personal_plans")
        .update({ content: updatedContent })
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });
}
