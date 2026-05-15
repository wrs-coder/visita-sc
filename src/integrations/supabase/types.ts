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
      checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          info_text: string | null
          link_or_notes: string | null
          sort_order: number
          status: Database["public"]["Enums"]["checklist_status"]
          title: string
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          info_text?: string | null
          link_or_notes?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["checklist_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          info_text?: string | null
          link_or_notes?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["checklist_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      congregations: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          superintendent_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          superintendent_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          superintendent_id?: string
        }
        Relationships: []
      }
      field_assignments: {
        Row: {
          acompanhante: string | null
          created_at: string
          dirigente: string | null
          event_date: string
          id: string
          meeting_point: string | null
          meeting_time: string | null
          notes: string | null
          period: string
          piloto: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          acompanhante?: string | null
          created_at?: string
          dirigente?: string | null
          event_date: string
          id?: string
          meeting_point?: string | null
          meeting_time?: string | null
          notes?: string | null
          period: string
          piloto?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          acompanhante?: string | null
          created_at?: string
          dirigente?: string | null
          event_date?: string
          id?: string
          meeting_point?: string | null
          meeting_time?: string | null
          notes?: string | null
          period?: string
          piloto?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_assignments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          host_name: string
          id: string
          location: string | null
          meal_date: string
          meal_time: string | null
          notes: string | null
          type: Database["public"]["Enums"]["meal_type"]
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          host_name: string
          id?: string
          location?: string | null
          meal_date: string
          meal_time?: string | null
          notes?: string | null
          type: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          host_name?: string
          id?: string
          location?: string | null
          meal_date?: string
          meal_time?: string | null
          notes?: string | null
          type?: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      private_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          superintendent_id: string
          title: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          superintendent_id: string
          title?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          superintendent_id?: string
          title?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          congregation_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_congregation_fk"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          created_at: string
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          start_time: string | null
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          congregation_id: string | null
          created_at: string
          elder_position: Database["public"]["Enums"]["elder_position"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          elder_position?: Database["public"]["Enums"]["elder_position"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          elder_position?: Database["public"]["Enums"]["elder_position"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          congregation_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
        }
        Insert: {
          congregation_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
        }
        Update: {
          congregation_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_visit: {
        Args: { _user_id: string; _visit_id: string }
        Returns: boolean
      }
      get_user_congregation: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superintendent_of: {
        Args: { _congregation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superintendent" | "elder"
      checklist_status: "pending" | "done"
      elder_position: "coordenador" | "secretario" | "sup_servico" | "corpo"
      event_type:
        | "field_morning"
        | "field_afternoon"
        | "elders_meeting"
        | "pioneers_meeting"
        | "midweek_meeting"
        | "weekend_meeting"
        | "other"
      meal_type: "lunch" | "dinner" | "breakfast"
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
    Enums: {
      app_role: ["superintendent", "elder"],
      checklist_status: ["pending", "done"],
      elder_position: ["coordenador", "secretario", "sup_servico", "corpo"],
      event_type: [
        "field_morning",
        "field_afternoon",
        "elders_meeting",
        "pioneers_meeting",
        "midweek_meeting",
        "weekend_meeting",
        "other",
      ],
      meal_type: ["lunch", "dinner", "breakfast"],
    },
  },
} as const
