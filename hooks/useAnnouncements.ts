import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Announcement } from "@/types/database";

export type { Announcement };

export function useAnnouncements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["announcements"],
    queryFn: async (): Promise<Announcement[]> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    enabled: !!user,
  });
}
