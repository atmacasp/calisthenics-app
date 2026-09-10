// Bu dosya, supabase/migrations/0001..0005 altındaki şemayı elle yansıtır.
// `supabase gen types typescript` çalıştırabildiğinizde onunla değiştirmeniz önerilir,
// ama o zamana kadar tip güvenliğinin temelini bu sağlar.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          unit_preference: "metric" | "imperial";
          level: "beginner" | "intermediate" | "advanced";
          onboarding_completed: boolean;
          theme: "system" | "light" | "dark";
          language: string;
          notifications_enabled: boolean;
          reminder_hour: number;
          current_streak: number;
          longest_streak: number;
          last_workout_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          unit_preference?: "metric" | "imperial";
          level?: "beginner" | "intermediate" | "advanced";
          onboarding_completed?: boolean;
          theme?: "system" | "light" | "dark";
          language?: string;
          notifications_enabled?: boolean;
          reminder_hour?: number;
          current_streak?: number;
          longest_streak?: number;
          last_workout_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };

      movement_groups: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["movement_groups"]["Insert"]>;
        Relationships: [];
      };

      movements: {
        Row: {
          id: string;
          group_id: string | null;
          name: string;
          description: string | null;
          gif_url: string | null;
          image_url: string | null;
          difficulty_level: number | null;
          order_index: number;
          created_at: string;
          movement_type: "progression" | "foundation";
          target_type: "reps_sets" | "duration" | null;
          target_sets: number | null;
          target_reps: number | null;
          target_duration_seconds: number | null;
          target_note: string | null;
          how_to: string[] | null;
          cues: string[] | null;
          mistakes: string[] | null;
        };
        Insert: {
          id?: string;
          group_id?: string | null;
          name: string;
          description?: string | null;
          gif_url?: string | null;
          image_url?: string | null;
          difficulty_level?: number | null;
          order_index?: number;
          created_at?: string;
          movement_type?: "progression" | "foundation";
          target_type?: "reps_sets" | "duration" | null;
          target_sets?: number | null;
          target_reps?: number | null;
          target_duration_seconds?: number | null;
          target_note?: string | null;
          how_to?: string[] | null;
          cues?: string[] | null;
          mistakes?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["movements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "movements_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "movement_groups";
            referencedColumns: ["id"];
          }
        ];
      };

      programs: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          level: "beginner" | "intermediate" | "advanced" | null;
          is_premium: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          level?: "beginner" | "intermediate" | "advanced" | null;
          is_premium?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
        Relationships: [];
      };

      program_movements: {
        Row: {
          id: string;
          program_id: string | null;
          movement_id: string | null;
          day_of_week: number | null;
          target_sets: number | null;
          target_reps: number | null;
          target_duration_seconds: number | null;
          rest_seconds: number;
          order_index: number;
        };
        Insert: {
          id?: string;
          program_id?: string | null;
          movement_id?: string | null;
          day_of_week?: number | null;
          target_sets?: number | null;
          target_reps?: number | null;
          target_duration_seconds?: number | null;
          rest_seconds?: number;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["program_movements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "program_movements_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_movements_movement_id_fkey";
            columns: ["movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          }
        ];
      };

      user_programs: {
        Row: {
          id: string;
          user_id: string | null;
          program_id: string | null;
          started_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          program_id?: string | null;
          started_at?: string;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["user_programs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_programs_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          }
        ];
      };

      workout_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          program_id: string | null;
          started_at: string;
          ended_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          program_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          }
        ];
      };

      workout_sets: {
        Row: {
          id: string;
          session_id: string | null;
          movement_id: string | null;
          set_number: number;
          reps: number | null;
          duration_seconds: number | null;
          added_weight_kg: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          movement_id?: string | null;
          set_number: number;
          reps?: number | null;
          duration_seconds?: number | null;
          added_weight_kg?: number | null;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workout_sets_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sets_movement_id_fkey";
            columns: ["movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          }
        ];
      };

      body_weight_logs: {
        Row: {
          id: string;
          user_id: string | null;
          weight_kg: number;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          weight_kg: number;
          logged_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["body_weight_logs"]["Insert"]>;
        Relationships: [];
      };

      movement_prerequisites: {
        Row: {
          id: string;
          movement_id: string;
          prerequisite_movement_id: string;
          target_sets: number | null;
          target_reps: number | null;
          target_duration_seconds: number | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          movement_id: string;
          prerequisite_movement_id: string;
          target_sets?: number | null;
          target_reps?: number | null;
          target_duration_seconds?: number | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["movement_prerequisites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "movement_prerequisites_movement_id_fkey";
            columns: ["movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movement_prerequisites_prerequisite_movement_id_fkey";
            columns: ["prerequisite_movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_user: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      /** migration 0017 - program günlerini tek update ile kaydırır, taşınan satır sayısını döner */
      remap_program_days: {
        Args: { p_program_id: string; p_map: Record<string, number> };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
