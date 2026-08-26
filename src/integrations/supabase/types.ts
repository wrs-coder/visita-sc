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
    PostgrestVersion: "14.17"
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
      checklist_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: string
          name: string
          superintendent_id: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name: string
          superintendent_id: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name?: string
          superintendent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      circuit_schedule_events: {
        Row: {
          companion: string | null
          congregation_ids: string[]
          created_at: string
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          scope: string
          start_time: string | null
          status: string
          superintendent_id: string
          title: string
          updated_at: string
          visible_to_spouse: boolean
        }
        Insert: {
          companion?: string | null
          congregation_ids?: string[]
          created_at?: string
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          scope?: string
          start_time?: string | null
          status?: string
          superintendent_id: string
          title: string
          updated_at?: string
          visible_to_spouse?: boolean
        }
        Update: {
          companion?: string | null
          congregation_ids?: string[]
          created_at?: string
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          scope?: string
          start_time?: string | null
          status?: string
          superintendent_id?: string
          title?: string
          updated_at?: string
          visible_to_spouse?: boolean
        }
        Relationships: []
      }
      congregations: {
        Row: {
          created_at: string
          elder_tab_password_created_by: string | null
          elder_tab_password_hash: string | null
          elder_tab_password_plain: string | null
          elder_tab_password_updated_at: string | null
          id: string
          invite_code: string
          is_active: boolean
          name: string
          superintendent_id: string
        }
        Insert: {
          created_at?: string
          elder_tab_password_created_by?: string | null
          elder_tab_password_hash?: string | null
          elder_tab_password_plain?: string | null
          elder_tab_password_updated_at?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          name: string
          superintendent_id: string
        }
        Update: {
          created_at?: string
          elder_tab_password_created_by?: string | null
          elder_tab_password_hash?: string | null
          elder_tab_password_plain?: string | null
          elder_tab_password_updated_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          name?: string
          superintendent_id?: string
        }
        Relationships: []
      }
      couple_messages: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          read_by_super: boolean
          read_by_wife: boolean
          superintendent_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          read_by_super?: boolean
          read_by_wife?: boolean
          superintendent_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          read_by_super?: boolean
          read_by_wife?: boolean
          superintendent_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "couple_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_encouragements: {
        Row: {
          address: string | null
          category:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          contact: string | null
          created_at: string
          health_info: string | null
          id: string
          person_name: string | null
          sort_order: number
          source: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info: string | null
          template_event_id: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          address?: string | null
          category?:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          contact?: string | null
          created_at?: string
          health_info?: string | null
          id?: string
          person_name?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          address?: string | null
          category?:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          contact?: string | null
          created_at?: string
          health_info?: string | null
          id?: string
          person_name?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      elder_local_matters: {
        Row: {
          created_at: string
          id: string
          info: string | null
          sort_order: number
          source: Database["public"]["Enums"]["elder_event_source"]
          sources: string | null
          subject: string | null
          suggested_by: string | null
          template_event_id: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          info?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          sources?: string | null
          subject?: string | null
          suggested_by?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          info?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          sources?: string | null
          subject?: string | null
          suggested_by?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      elder_pastoral_visits: {
        Row: {
          address: string | null
          companion: string | null
          created_at: string
          family_members: string | null
          family_name: string | null
          id: string
          slot_label: string | null
          sort_order: number
          source: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info: string | null
          template_event_id: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          address?: string | null
          companion?: string | null
          created_at?: string
          family_members?: string | null
          family_name?: string | null
          id?: string
          slot_label?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          address?: string | null
          companion?: string | null
          created_at?: string
          family_members?: string | null
          family_name?: string | null
          id?: string
          slot_label?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          spiritual_info?: string | null
          template_event_id?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      elder_program_template_events: {
        Row: {
          address: string | null
          category:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          companion: string | null
          contact: string | null
          created_at: string
          family_members: string | null
          family_name: string | null
          field_group: string | null
          full_name: string | null
          health_info: string | null
          id: string
          info: string | null
          person_name: string | null
          purpose:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          section: Database["public"]["Enums"]["elder_program_section"]
          slot_label: string | null
          sort_order: number
          sources: string | null
          spiritual_info: string | null
          subject: string | null
          suggested_by: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          companion?: string | null
          contact?: string | null
          created_at?: string
          family_members?: string | null
          family_name?: string | null
          field_group?: string | null
          full_name?: string | null
          health_info?: string | null
          id?: string
          info?: string | null
          person_name?: string | null
          purpose?:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          section: Database["public"]["Enums"]["elder_program_section"]
          slot_label?: string | null
          sort_order?: number
          sources?: string | null
          spiritual_info?: string | null
          subject?: string | null
          suggested_by?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?:
            | Database["public"]["Enums"]["elder_encouragement_category"]
            | null
          companion?: string | null
          contact?: string | null
          created_at?: string
          family_members?: string | null
          family_name?: string | null
          field_group?: string | null
          full_name?: string | null
          health_info?: string | null
          id?: string
          info?: string | null
          person_name?: string | null
          purpose?:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          section?: Database["public"]["Enums"]["elder_program_section"]
          slot_label?: string | null
          sort_order?: number
          sources?: string | null
          spiritual_info?: string | null
          subject?: string | null
          suggested_by?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_program_template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "elder_program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_program_template_sections: {
        Row: {
          additional_info: string
          created_at: string
          id: string
          section: Database["public"]["Enums"]["elder_program_section"]
          template_id: string
          updated_at: string
        }
        Insert: {
          additional_info?: string
          created_at?: string
          id?: string
          section: Database["public"]["Enums"]["elder_program_section"]
          template_id: string
          updated_at?: string
        }
        Update: {
          additional_info?: string
          created_at?: string
          id?: string
          section?: Database["public"]["Enums"]["elder_program_section"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_program_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "elder_program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_program_template_slots: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_program_template_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "elder_program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_program_templates: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: string
          name: string
          superintendent_id: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name: string
          superintendent_id: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name?: string
          superintendent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      elder_program_visit_sections: {
        Row: {
          additional_info: string
          created_at: string
          id: string
          section: Database["public"]["Enums"]["elder_program_section"]
          updated_at: string
          visit_id: string
        }
        Insert: {
          additional_info?: string
          created_at?: string
          id?: string
          section: Database["public"]["Enums"]["elder_program_section"]
          updated_at?: string
          visit_id: string
        }
        Update: {
          additional_info?: string
          created_at?: string
          id?: string
          section?: Database["public"]["Enums"]["elder_program_section"]
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      elder_program_visit_slots: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          visit_id?: string
        }
        Relationships: []
      }
      elder_recommendations: {
        Row: {
          created_at: string
          family_members: string | null
          field_group: string | null
          full_name: string | null
          id: string
          info: string | null
          purpose:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          sort_order: number
          source: Database["public"]["Enums"]["elder_event_source"]
          template_event_id: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          family_members?: string | null
          field_group?: string | null
          full_name?: string | null
          id?: string
          info?: string | null
          purpose?:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          template_event_id?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          family_members?: string | null
          field_group?: string | null
          full_name?: string | null
          id?: string
          info?: string | null
          purpose?:
            | Database["public"]["Enums"]["elder_recommendation_purpose"]
            | null
          sort_order?: number
          source?: Database["public"]["Enums"]["elder_event_source"]
          template_event_id?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      elder_tab_password_audit: {
        Row: {
          action: string
          actor_user_id: string
          congregation_id: string
          created_at: string
          id: string
          note: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          congregation_id: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          congregation_id?: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elder_tab_password_audit_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
        ]
      }
      elders_servants_meetings: {
        Row: {
          closing_prayer: string | null
          created_at: string
          id: string
          location: string | null
          meeting_at: string | null
          opening_prayer: string | null
          theme: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          closing_prayer?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string | null
          opening_prayer?: string | null
          theme?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          closing_prayer?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string | null
          opening_prayer?: string | null
          theme?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elders_servants_meetings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      field_assignments: {
        Row: {
          acompanhante: string | null
          acompanhante_for: string | null
          contact_phone: string | null
          created_at: string
          event_date: string
          id: string
          is_active: boolean
          meeting_point: string | null
          meeting_time: string | null
          notes: string | null
          period: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          acompanhante?: string | null
          acompanhante_for?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date: string
          id?: string
          is_active?: boolean
          meeting_point?: string | null
          meeting_time?: string | null
          notes?: string | null
          period: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          acompanhante?: string | null
          acompanhante_for?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date?: string
          id?: string
          is_active?: boolean
          meeting_point?: string | null
          meeting_time?: string | null
          notes?: string | null
          period?: string
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
      field_meeting_template_items: {
        Row: {
          auxiliary_leaders: string | null
          closing_prayer: string | null
          created_at: string
          day_offset: number
          id: string
          meeting_location: string | null
          meeting_time: string | null
          modality: Database["public"]["Enums"]["field_modality"]
          observations: string | null
          period: string
          sort_order: number
          template_id: string
          territory_location: string | null
          territory_number: string | null
        }
        Insert: {
          auxiliary_leaders?: string | null
          closing_prayer?: string | null
          created_at?: string
          day_offset?: number
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          modality?: Database["public"]["Enums"]["field_modality"]
          observations?: string | null
          period?: string
          sort_order?: number
          template_id: string
          territory_location?: string | null
          territory_number?: string | null
        }
        Update: {
          auxiliary_leaders?: string | null
          closing_prayer?: string | null
          created_at?: string
          day_offset?: number
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          modality?: Database["public"]["Enums"]["field_modality"]
          observations?: string | null
          period?: string
          sort_order?: number
          template_id?: string
          territory_location?: string | null
          territory_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_meeting_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "field_meeting_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      field_meeting_templates: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: string
          modality: Database["public"]["Enums"]["field_modality"]
          name: string
          observations: string | null
          superintendent_id: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["field_modality"]
          name: string
          observations?: string | null
          superintendent_id: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["field_modality"]
          name?: string
          observations?: string | null
          superintendent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      field_meetings: {
        Row: {
          auxiliary_leaders: string | null
          closing_prayer: string | null
          created_at: string
          event_date: string
          id: string
          is_active: boolean
          meeting_location: string | null
          meeting_time: string | null
          modality: Database["public"]["Enums"]["field_modality"]
          observations: string | null
          period: string
          territory_location: string | null
          territory_number: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          auxiliary_leaders?: string | null
          closing_prayer?: string | null
          created_at?: string
          event_date: string
          id?: string
          is_active?: boolean
          meeting_location?: string | null
          meeting_time?: string | null
          modality?: Database["public"]["Enums"]["field_modality"]
          observations?: string | null
          period: string
          territory_location?: string | null
          territory_number?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          auxiliary_leaders?: string | null
          closing_prayer?: string | null
          created_at?: string
          event_date?: string
          id?: string
          is_active?: boolean
          meeting_location?: string | null
          meeting_time?: string | null
          modality?: Database["public"]["Enums"]["field_modality"]
          observations?: string | null
          period?: string
          territory_location?: string | null
          territory_number?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_meetings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_day_notes: {
        Row: {
          created_at: string
          id: string
          meal_date: string
          notes: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_date: string
          notes?: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_date?: string
          notes?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_day_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          contact_phone: string | null
          created_at: string
          host_name: string | null
          id: string
          is_active: boolean
          location: string | null
          meal_date: string
          meal_time: string | null
          notes: string | null
          type: Database["public"]["Enums"]["meal_type"]
          updated_at: string
          visit_id: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          host_name?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          meal_date: string
          meal_time?: string | null
          notes?: string | null
          type: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          visit_id: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          host_name?: string | null
          id?: string
          is_active?: boolean
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
      meeting_talk_template_elders: {
        Row: {
          closing_prayer: string | null
          created_at: string
          meeting_time: string | null
          observations: string | null
          opening_prayer: string | null
          template_id: string
          theme: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          closing_prayer?: string | null
          created_at?: string
          meeting_time?: string | null
          observations?: string | null
          opening_prayer?: string | null
          template_id: string
          theme?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          closing_prayer?: string | null
          created_at?: string
          meeting_time?: string | null
          observations?: string | null
          opening_prayer?: string | null
          template_id?: string
          theme?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_talk_template_elders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "meeting_talk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_talk_template_midweek: {
        Row: {
          chairman: string | null
          closing_prayer: string | null
          created_at: string
          final_song: string | null
          observations: string | null
          service_talk_theme: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          chairman?: string | null
          closing_prayer?: string | null
          created_at?: string
          final_song?: string | null
          observations?: string | null
          service_talk_theme?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          chairman?: string | null
          closing_prayer?: string | null
          created_at?: string
          final_song?: string | null
          observations?: string | null
          service_talk_theme?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_talk_template_midweek_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "meeting_talk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_talk_template_pioneer: {
        Row: {
          closing_prayer: string | null
          created_at: string
          location: string | null
          meeting_time: string | null
          observations: string | null
          opening_prayer: string | null
          template_id: string
          theme: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          closing_prayer?: string | null
          created_at?: string
          location?: string | null
          meeting_time?: string | null
          observations?: string | null
          opening_prayer?: string | null
          template_id: string
          theme?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          closing_prayer?: string | null
          created_at?: string
          location?: string | null
          meeting_time?: string | null
          observations?: string | null
          opening_prayer?: string | null
          template_id?: string
          theme?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_talk_template_pioneer_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "meeting_talk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_talk_template_weekend_themes: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_talk_template_weekend_themes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_talk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_talk_templates: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: string
          name: string
          superintendent_id: string
          updated_at: string
          weekend_closing_song: string | null
          weekend_observations: string | null
          weekend_opening_song: string | null
          weekend_public_talk_theme: string | null
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name: string
          superintendent_id: string
          updated_at?: string
          weekend_closing_song?: string | null
          weekend_observations?: string | null
          weekend_opening_song?: string | null
          weekend_public_talk_theme?: string | null
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          name?: string
          superintendent_id?: string
          updated_at?: string
          weekend_closing_song?: string | null
          weekend_observations?: string | null
          weekend_opening_song?: string | null
          weekend_public_talk_theme?: string | null
        }
        Relationships: []
      }
      midweek_meetings: {
        Row: {
          chairman: string | null
          closing_prayer: string | null
          created_at: string
          id: string
          meeting_at: string | null
          service_talk_theme: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          chairman?: string | null
          closing_prayer?: string | null
          created_at?: string
          id?: string
          meeting_at?: string | null
          service_talk_theme?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          chairman?: string | null
          closing_prayer?: string | null
          created_at?: string
          id?: string
          meeting_at?: string | null
          service_talk_theme?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "midweek_meetings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_outlines: {
        Row: {
          content_json: Json
          created_at: string
          deleted_at: string | null
          folder_path: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          deleted_at?: string | null
          folder_path?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          deleted_at?: string | null
          folder_path?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pioneer_meetings: {
        Row: {
          closing_prayer: string | null
          created_at: string
          id: string
          location: string | null
          meeting_at: string | null
          opening_prayer: string | null
          super_meeting_at: string | null
          theme: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          closing_prayer?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string | null
          opening_prayer?: string | null
          super_meeting_at?: string | null
          theme?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          closing_prayer?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string | null
          opening_prayer?: string | null
          super_meeting_at?: string | null
          theme?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pioneer_meetings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      private_notes: {
        Row: {
          additional_info: string | null
          companion: string | null
          congregation_id: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          involved_names: string | null
          note_date: string | null
          note_type: string
          payload: Json
          superintendent_id: string
          title: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          additional_info?: string | null
          companion?: string | null
          congregation_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          involved_names?: string | null
          note_date?: string | null
          note_type?: string
          payload?: Json
          superintendent_id: string
          title?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          additional_info?: string | null
          companion?: string | null
          congregation_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          involved_names?: string | null
          note_date?: string | null
          note_type?: string
          payload?: Json
          superintendent_id?: string
          title?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_notes_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
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
          circuit: string | null
          congregation_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          username: string | null
          wife_invite_code: string | null
        }
        Insert: {
          circuit?: string | null
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          username?: string | null
          wife_invite_code?: string | null
        }
        Update: {
          circuit?: string | null
          congregation_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          username?: string | null
          wife_invite_code?: string | null
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
      program_template_items: {
        Row: {
          created_at: string
          day_offset: number
          id: string
          kind: string
          payload: Json
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          day_offset?: number
          id?: string
          kind: string
          payload?: Json
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          day_offset?: number
          id?: string
          kind?: string
          payload?: Json
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
        Row: {
          created_at: string
          general_observations: string | null
          id: string
          meal_day_notes: Json
          name: string
          slot: number
          study_day_notes: Json
          study_general_observations: string | null
          superintendent_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          general_observations?: string | null
          id?: string
          meal_day_notes?: Json
          name: string
          slot: number
          study_day_notes?: Json
          study_general_observations?: string | null
          superintendent_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          general_observations?: string | null
          id?: string
          meal_day_notes?: Json
          name?: string
          slot?: number
          study_day_notes?: Json
          study_general_observations?: string | null
          superintendent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          created_at: string
          end_time: string | null
          event_date: string
          id: string
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
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
      talk_themes: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: string
          superintendent_id: string
          title: string
          updated_at: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          superintendent_id: string
          title: string
          updated_at?: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: string
          superintendent_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_schedule: {
        Row: {
          all_day: boolean
          contact_phone: string | null
          created_at: string
          departure_time: string | null
          description: string | null
          direction: string | null
          driver_name: string
          event_date: string | null
          event_type: string | null
          id: string
          is_active: boolean
          notes: string | null
          return_time: string | null
          updated_at: string
          visit_id: string
          weekday: number | null
        }
        Insert: {
          all_day?: boolean
          contact_phone?: string | null
          created_at?: string
          departure_time?: string | null
          description?: string | null
          direction?: string | null
          driver_name: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          return_time?: string | null
          updated_at?: string
          visit_id: string
          weekday?: number | null
        }
        Update: {
          all_day?: boolean
          contact_phone?: string | null
          created_at?: string
          departure_time?: string | null
          description?: string | null
          direction?: string | null
          driver_name?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          return_time?: string | null
          updated_at?: string
          visit_id?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_schedule_visit_id_fkey"
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
      visit_pending_updates: {
        Row: {
          backup_pdf_path: string | null
          created_at: string
          diff: Json
          id: string
          resolved_at: string | null
          resolved_by: string | null
          template_id: string
          template_type: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          backup_pdf_path?: string | null
          created_at?: string
          diff?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          template_id: string
          template_type: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          backup_pdf_path?: string | null
          created_at?: string
          diff?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          template_id?: string
          template_type?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_pending_updates_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_template_overrides: {
        Row: {
          created_at: string
          elders_meeting_time: string | null
          elders_observations: string | null
          elders_weekday: number | null
          field_observations: string | null
          midweek_final_song: string | null
          midweek_observations: string | null
          pioneer_meeting_time: string | null
          pioneer_observations: string | null
          pioneer_weekday: number | null
          program_general_observations: string | null
          updated_at: string
          visit_id: string
          weekend_closing_song: string | null
          weekend_observations: string | null
          weekend_opening_song: string | null
        }
        Insert: {
          created_at?: string
          elders_meeting_time?: string | null
          elders_observations?: string | null
          elders_weekday?: number | null
          field_observations?: string | null
          midweek_final_song?: string | null
          midweek_observations?: string | null
          pioneer_meeting_time?: string | null
          pioneer_observations?: string | null
          pioneer_weekday?: number | null
          program_general_observations?: string | null
          updated_at?: string
          visit_id: string
          weekend_closing_song?: string | null
          weekend_observations?: string | null
          weekend_opening_song?: string | null
        }
        Update: {
          created_at?: string
          elders_meeting_time?: string | null
          elders_observations?: string | null
          elders_weekday?: number | null
          field_observations?: string | null
          midweek_final_song?: string | null
          midweek_observations?: string | null
          pioneer_meeting_time?: string | null
          pioneer_observations?: string | null
          pioneer_weekday?: number | null
          program_general_observations?: string | null
          updated_at?: string
          visit_id?: string
          weekend_closing_song?: string | null
          weekend_observations?: string | null
          weekend_opening_song?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_template_overrides_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          checklist_template_id: string | null
          congregation_id: string
          created_at: string
          elder_program_template_id: string | null
          end_date: string
          field_meeting_template_id: string | null
          id: string
          is_active: boolean
          last_applied_at: string | null
          meeting_talk_template_id: string | null
          start_date: string
          substitute_name: string | null
          substitute_phone: string | null
          template_id: string | null
          template_snapshot: Json
          title: string
        }
        Insert: {
          checklist_template_id?: string | null
          congregation_id: string
          created_at?: string
          elder_program_template_id?: string | null
          end_date: string
          field_meeting_template_id?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          meeting_talk_template_id?: string | null
          start_date: string
          substitute_name?: string | null
          substitute_phone?: string | null
          template_id?: string | null
          template_snapshot?: Json
          title: string
        }
        Update: {
          checklist_template_id?: string | null
          congregation_id?: string
          created_at?: string
          elder_program_template_id?: string | null
          end_date?: string
          field_meeting_template_id?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          meeting_talk_template_id?: string | null
          start_date?: string
          substitute_name?: string | null
          substitute_phone?: string | null
          template_id?: string | null
          template_snapshot?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_field_meeting_template_id_fkey"
            columns: ["field_meeting_template_id"]
            isOneToOne: false
            referencedRelation: "field_meeting_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_meetings: {
        Row: {
          created_at: string
          id: string
          meeting_at: string | null
          public_talk_theme: string | null
          talk_theme_id: string | null
          talk_theme_title: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_at?: string | null
          public_talk_theme?: string | null
          talk_theme_id?: string | null
          talk_theme_title?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_at?: string | null
          public_talk_theme?: string | null
          talk_theme_id?: string | null
          talk_theme_title?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekend_meetings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_visit_pending_updates: { Args: never; Returns: undefined }
      delete_expired_circuit_events: { Args: never; Returns: undefined }
      elder_tab_password_is_set: {
        Args: { _congregation_id: string }
        Returns: boolean
      }
      get_elder_tab_password: {
        Args: { _congregation_id: string }
        Returns: string
      }
      is_elder_coordinator: {
        Args: { _congregation_id: string }
        Returns: boolean
      }
      set_elder_tab_password:
        | {
            Args: { _congregation_id: string; _new_password: string }
            Returns: undefined
          }
        | {
            Args: {
              _actor_user_id?: string
              _congregation_id: string
              _new_password: string
            }
            Returns: undefined
          }
      verify_elder_tab_password: {
        Args: { _congregation_id: string; _password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superintendent" | "elder"
      checklist_status: "pending" | "done"
      elder_encouragement_category: "inactive" | "sick" | "special_privileges"
      elder_event_source: "template" | "manual"
      elder_position: "coordenador" | "secretario" | "sup_servico" | "corpo"
      elder_program_section:
        | "pastoral"
        | "encouragement"
        | "recommendations"
        | "local"
      elder_recommendation_purpose:
        | "ministerial_servant"
        | "elder"
        | "redesignation"
        | "removal"
        | "cca_change"
      event_type:
        | "field_morning"
        | "field_afternoon"
        | "elders_meeting"
        | "pioneers_meeting"
        | "midweek_meeting"
        | "weekend_meeting"
        | "other"
      field_modality:
        | "casa_em_casa"
        | "estudos_revisitas"
        | "telefone"
        | "cartas"
        | "telefone_cartas"
        | "grupo_de_campo"
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
      elder_encouragement_category: ["inactive", "sick", "special_privileges"],
      elder_event_source: ["template", "manual"],
      elder_position: ["coordenador", "secretario", "sup_servico", "corpo"],
      elder_program_section: [
        "pastoral",
        "encouragement",
        "recommendations",
        "local",
      ],
      elder_recommendation_purpose: [
        "ministerial_servant",
        "elder",
        "redesignation",
        "removal",
        "cca_change",
      ],
      event_type: [
        "field_morning",
        "field_afternoon",
        "elders_meeting",
        "pioneers_meeting",
        "midweek_meeting",
        "weekend_meeting",
        "other",
      ],
      field_modality: [
        "casa_em_casa",
        "estudos_revisitas",
        "telefone",
        "cartas",
        "telefone_cartas",
        "grupo_de_campo",
      ],
      meal_type: ["lunch", "dinner", "breakfast"],
    },
  },
} as const
