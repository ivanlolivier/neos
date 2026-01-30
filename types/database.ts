export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          role: "member" | "coach" | "admin";
          phone: string | null;
          vam: number | null;
          date_of_birth: string | null;
          resting_heart_rate: number | null;
          max_heart_rate: number | null;
          running_experience: string | null;
          race_experience: string | null;
          sport_goals: string | null;
          extra_sport_goals: string | null;
          garmin_access_token: string | null;
          garmin_refresh_token: string | null;
          healthkit_enabled: boolean;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          role?: "member" | "coach" | "admin";
          phone?: string | null;
          vam?: number | null;
          date_of_birth?: string | null;
          resting_heart_rate?: number | null;
          max_heart_rate?: number | null;
          running_experience?: string | null;
          race_experience?: string | null;
          sport_goals?: string | null;
          extra_sport_goals?: string | null;
          garmin_access_token?: string | null;
          garmin_refresh_token?: string | null;
          healthkit_enabled?: boolean;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: "member" | "coach" | "admin";
          phone?: string | null;
          vam?: number | null;
          date_of_birth?: string | null;
          resting_heart_rate?: number | null;
          max_heart_rate?: number | null;
          running_experience?: string | null;
          race_experience?: string | null;
          sport_goals?: string | null;
          extra_sport_goals?: string | null;
          garmin_access_token?: string | null;
          garmin_refresh_token?: string | null;
          healthkit_enabled?: boolean;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      trainings: {
        Row: {
          id: string;
          type: "running" | "strength" | "track";
          name: string;
          day_of_week: number;
          time_slots: string[];
          location: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "running" | "strength" | "track";
          name: string;
          day_of_week: number;
          time_slots?: string[];
          location?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: "running" | "strength" | "track";
          name?: string;
          day_of_week?: number;
          time_slots?: string[];
          location?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      training_sessions: {
        Row: {
          id: string;
          training_id: string;
          date: string;
          time_slot: string;
          notes: string | null;
          cancelled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          training_id: string;
          date: string;
          time_slot: string;
          notes?: string | null;
          cancelled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          training_id?: string;
          date?: string;
          time_slot?: string;
          notes?: string | null;
          cancelled?: boolean;
          created_at?: string;
        };
      };
      attendances: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          time_slot: string;
          status: "confirmed" | "cancelled" | "attended" | "no_show" | "not_going";
          confirmed_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          time_slot: string;
          status?: "confirmed" | "cancelled" | "attended" | "no_show" | "not_going";
          confirmed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          time_slot?: string;
          status?: "confirmed" | "cancelled" | "attended" | "no_show" | "not_going";
          confirmed_at?: string;
          updated_at?: string;
        };
      };
      personal_plans: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          plan_type: "running" | "weekend" | "strength";
          content: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          plan_type: "running" | "weekend" | "strength";
          content: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          plan_type?: "running" | "weekend" | "strength";
          content?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          type: "track" | "trail" | "trekking" | "workshop" | "social" | "race";
          description: string | null;
          date: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          location_url: string | null;
          image_url: string | null;
          max_capacity: number | null;
          registration_deadline: string | null;
          price: number;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: "track" | "trail" | "trekking" | "workshop" | "social" | "race";
          description?: string | null;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          image_url?: string | null;
          max_capacity?: number | null;
          registration_deadline?: string | null;
          price?: number;
          is_published?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: "track" | "trail" | "trekking" | "workshop" | "social" | "race";
          description?: string | null;
          date?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          image_url?: string | null;
          max_capacity?: number | null;
          registration_deadline?: string | null;
          price?: number;
          is_published?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: "registered" | "waitlist" | "cancelled" | "attended";
          notes: string | null;
          registered_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: "registered" | "waitlist" | "cancelled" | "attended";
          notes?: string | null;
          registered_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          status?: "registered" | "waitlist" | "cancelled" | "attended";
          notes?: string | null;
          registered_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          source: "garmin" | "healthkit" | "manual";
          external_id: string | null;
          activity_type: string;
          date: string;
          start_time: string | null;
          distance_km: number | null;
          duration_seconds: number | null;
          avg_pace_seconds: number | null;
          avg_heart_rate: number | null;
          max_heart_rate: number | null;
          elevation_gain_m: number | null;
          calories: number | null;
          title: string | null;
          notes: string | null;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: "garmin" | "healthkit" | "manual";
          external_id?: string | null;
          activity_type?: string;
          date: string;
          start_time?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          avg_pace_seconds?: number | null;
          avg_heart_rate?: number | null;
          max_heart_rate?: number | null;
          elevation_gain_m?: number | null;
          calories?: number | null;
          title?: string | null;
          notes?: string | null;
          raw_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: "garmin" | "healthkit" | "manual";
          external_id?: string | null;
          activity_type?: string;
          date?: string;
          start_time?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          avg_pace_seconds?: number | null;
          avg_heart_rate?: number | null;
          max_heart_rate?: number | null;
          elevation_gain_m?: number | null;
          calories?: number | null;
          title?: string | null;
          notes?: string | null;
          raw_data?: Json | null;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      post_photos: {
        Row: {
          id: string;
          post_id: string;
          photo_url: string;
          thumbnail_url: string | null;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          photo_url: string;
          thumbnail_url?: string | null;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          photo_url?: string;
          thumbnail_url?: string | null;
          order?: number;
          created_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          event_name: string;
          result_seconds: number;
          distance_km: number | null;
          date: string | null;
          location: string | null;
          notes: string | null;
          is_official: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_name: string;
          result_seconds: number;
          distance_km?: number | null;
          date?: string | null;
          location?: string | null;
          notes?: string | null;
          is_official?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_name?: string;
          result_seconds?: number;
          distance_km?: number | null;
          date?: string | null;
          location?: string | null;
          notes?: string | null;
          is_official?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string | null;
          image_url: string | null;
          pinned: boolean;
          published_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          author_id?: string | null;
          image_url?: string | null;
          pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          author_id?: string | null;
          image_url?: string | null;
          pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          device_id: string | null;
          platform: "ios" | "android" | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          device_id?: string | null;
          platform?: "ios" | "android" | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          device_id?: string | null;
          platform?: "ios" | "android" | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience types
export type Profile = Tables<"profiles">;
export type Training = Tables<"trainings">;
export type TrainingSession = Tables<"training_sessions">;
export type Attendance = Tables<"attendances">;
export type PersonalPlan = Tables<"personal_plans">;
export type Event = Tables<"events">;
export type EventRegistration = Tables<"event_registrations">;
export type Activity = Tables<"activities">;
export type Post = Tables<"posts">;
export type PostPhoto = Tables<"post_photos">;
export type PersonalRecord = Tables<"personal_records">;
export type Announcement = Tables<"announcements">;
