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
      daily_count: {
        Row: {
          date: string
          solved: number | null
          user_id: string
        }
        Insert: {
          date: string
          solved?: number | null
          user_id: string
        }
        Update: {
          date?: string
          solved?: number | null
          user_id?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          difficulty: string | null
          platform: string
          problem_id: string
          rating: number | null
          tags: string[] | null
          title: string
        }
        Insert: {
          difficulty?: string | null
          platform: string
          problem_id: string
          rating?: number | null
          tags?: string[] | null
          title: string
        }
        Update: {
          difficulty?: string | null
          platform?: string
          problem_id?: string
          rating?: number | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string
          id: number
          name: string | null
          onboarding_completed: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          onboarding_completed?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          onboarding_completed?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      solved_problems: {
        Row: {
          already_solved: boolean
          platform: string
          problem_id: string
          solved_at: string
          solved_date: string
          user_id: string
        }
        Insert: {
          already_solved?: boolean
          platform: string
          problem_id: string
          solved_at?: string
          solved_date?: string
          user_id: string
        }
        Update: {
          already_solved?: boolean
          platform?: string
          problem_id?: string
          solved_at?: string
          solved_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solved_problems_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["problem_id"]
          },
        ]
      }
      user_contest: {
        Row: {
          contest_id: string
          date: string | null
          platform: string
          rank: number
          rating: number | null
          user_id: string
        }
        Insert: {
          contest_id: string
          date?: string | null
          platform: string
          rank: number
          rating?: number | null
          user_id: string
        }
        Update: {
          contest_id?: string
          date?: string | null
          platform?: string
          rank?: number
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_platform_data: {
        Row: {
          id: string
          max_rating: number
          platform: string | null
          rating: number
          solved_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          max_rating: number
          platform?: string | null
          rating: number
          solved_count: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          max_rating?: number
          platform?: string | null
          rating?: number
          solved_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_platforms: {
        Row: {
          created_at: string
          handle: string
          id: number
          last_synced_at: string
          platform: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          handle: string
          id?: number
          last_synced_at?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: number
          last_synced_at?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      "user-streak": {
        Row: {
          curr_streak: number | null
          longest_streak: number | null
          updated_on: string | null
          user_id: string
        }
        Insert: {
          curr_streak?: number | null
          longest_streak?: number | null
          updated_on?: string | null
          user_id?: string
        }
        Update: {
          curr_streak?: number | null
          longest_streak?: number | null
          updated_on?: string | null
          user_id?: string
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
