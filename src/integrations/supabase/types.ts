export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          earned_on: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          earned_on?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          earned_on?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_days: number
          current_streak: number
          id: string
          longest_streak: number
          started_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_days?: number
          current_streak?: number
          id?: string
          longest_streak?: number
          started_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_days?: number
          current_streak?: number
          id?: string
          longest_streak?: number
          started_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          daily_tasks: Json
          description: string | null
          id: string
          slug: string
          title: string
          total_days: number
        }
        Insert: {
          created_at?: string
          daily_tasks?: Json
          description?: string | null
          id?: string
          slug: string
          title: string
          total_days?: number
        }
        Update: {
          created_at?: string
          daily_tasks?: Json
          description?: string | null
          id?: string
          slug?: string
          title?: string
          total_days?: number
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          nutrition_no_late_snack: boolean
          nutrition_no_sugar: boolean
          nutrition_produce: boolean
          nutrition_protein: boolean
          sleep_minutes: number
          steps: number
          updated_at: string
          user_id: string
          walk_km: number
          walk_minutes: number
          water_ml: number
          workout_done: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          nutrition_no_late_snack?: boolean
          nutrition_no_sugar?: boolean
          nutrition_produce?: boolean
          nutrition_protein?: boolean
          sleep_minutes?: number
          steps?: number
          updated_at?: string
          user_id: string
          walk_km?: number
          walk_minutes?: number
          water_ml?: number
          workout_done?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          nutrition_no_late_snack?: boolean
          nutrition_no_sugar?: boolean
          nutrition_produce?: boolean
          nutrition_protein?: boolean
          sleep_minutes?: number
          steps?: number
          updated_at?: string
          user_id?: string
          walk_km?: number
          walk_minutes?: number
          water_ml?: number
          workout_done?: boolean
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          metric: string | null
          status: string
          target_value: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric?: string | null
          status?: string
          target_value?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string | null
          status?: string
          target_value?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          coach_tone: string
          created_at: string
          daily_schedule: string | null
          dark_mode: boolean
          email: string | null
          gender: string | null
          gym_access: boolean | null
          height_cm: number | null
          id: string
          name: string | null
          notifications_enabled: boolean
          onboarded: boolean
          primary_goal: string | null
          sleep_target_min: number
          steps_target: number
          updated_at: string
          waist_cm: number | null
          water_target_ml: number
          weight_kg: number | null
          workout_location: string | null
          workout_minutes: string | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          coach_tone?: string
          created_at?: string
          daily_schedule?: string | null
          dark_mode?: boolean
          email?: string | null
          gender?: string | null
          gym_access?: boolean | null
          height_cm?: number | null
          id: string
          name?: string | null
          notifications_enabled?: boolean
          onboarded?: boolean
          primary_goal?: string | null
          sleep_target_min?: number
          steps_target?: number
          updated_at?: string
          waist_cm?: number | null
          water_target_ml?: number
          weight_kg?: number | null
          workout_location?: string | null
          workout_minutes?: string | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          coach_tone?: string
          created_at?: string
          daily_schedule?: string | null
          dark_mode?: boolean
          email?: string | null
          gender?: string | null
          gym_access?: boolean | null
          height_cm?: number | null
          id?: string
          name?: string | null
          notifications_enabled?: boolean
          onboarded?: boolean
          primary_goal?: string | null
          sleep_target_min?: number
          steps_target?: number
          updated_at?: string
          waist_cm?: number | null
          water_target_ml?: number
          weight_kg?: number | null
          workout_location?: string | null
          workout_minutes?: string | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string
          duration_min: number | null
          id: string
          user_id: string
          workout_id: string | null
          workout_title: string | null
        }
        Insert: {
          completed_at?: string
          duration_min?: number | null
          id?: string
          user_id: string
          workout_id?: string | null
          workout_title?: string | null
        }
        Update: {
          completed_at?: string
          duration_min?: number | null
          id?: string
          user_id?: string
          workout_id?: string | null
          workout_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          calories: number
          categories: string[]
          created_at: string
          description: string | null
          difficulty: string
          duration_min: number
          equipment: string
          exercises: Json
          id: string
          slug: string
          title: string
        }
        Insert: {
          calories?: number
          categories?: string[]
          created_at?: string
          description?: string | null
          difficulty: string
          duration_min: number
          equipment?: string
          exercises?: Json
          id?: string
          slug: string
          title: string
        }
        Update: {
          calories?: number
          categories?: string[]
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_min?: number
          equipment?: string
          exercises?: Json
          id?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
