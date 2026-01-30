import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { PersonalRecord } from "@/types/database";

export function usePersonalRecords() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["personal-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", user!.id)
        .order("event_name")
        .order("result_seconds", { ascending: true });

      if (error) throw error;
      return data as PersonalRecord[];
    },
    enabled: !!user,
  });
}

export function useAddPersonalRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: {
      event_name: string;
      result_seconds: number;
      distance_km?: number;
      date?: string;
      location?: string;
      notes?: string;
      is_official?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("personal_records")
        .insert({
          user_id: user!.id,
          ...record,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PersonalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-records"] });
    },
  });
}

export function useUpdatePersonalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...record
    }: {
      id: string;
      event_name?: string;
      result_seconds?: number;
      distance_km?: number | null;
      date?: string | null;
      location?: string | null;
      notes?: string | null;
      is_official?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("personal_records")
        .update({
          ...record,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PersonalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-records"] });
    },
  });
}

export function useDeletePersonalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("personal_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-records"] });
    },
  });
}
