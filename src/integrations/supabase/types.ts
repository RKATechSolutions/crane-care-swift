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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          access_suggestion: string | null
          account_id: string | null
          account_name: string | null
          account_num: string | null
          area_name: string | null
          asset_created_at: string | null
          asset_criticality_level: string | null
          asset_id1: string | null
          asset_id2: string | null
          asset_lifecycle_stage: string | null
          asset_type: string | null
          barcode: string | null
          brand_make: string | null
          capacity: string | null
          class_name: string
          client_id: string | null
          commission_date: string | null
          compliance_status: string | null
          configuration: string | null
          control_type: string | null
          crane_classification: string | null
          crane_manufacturer: string | null
          crane_operational_status: string | null
          created_at: string
          created_by_id: string | null
          description: string | null
          design_standard: string | null
          duty_class: string | null
          environment_exposure: string | null
          external_id: string | null
          grade_size: string | null
          hoist_configuration: string | null
          hook_type: string | null
          id: string
          installation_date: string | null
          latitude: number | null
          length_lift: string | null
          lift_height_m: number | null
          lifting_medium_hoist1: string | null
          lifting_medium_hoist2: string | null
          location_id: string | null
          location_name: string | null
          location_num: string | null
          longitude: number | null
          major_inspection_due_date: string | null
          major_inspection_interval_years: number | null
          manufacturer: string | null
          manufacturer_hoist1: string | null
          manufacturer_hoist2: string | null
          model_hoist1: string | null
          model_hoist2: string | null
          model_number: string | null
          notes: string | null
          pendant_brand: string | null
          pendant_remote: string | null
          power: string | null
          power_supply: string | null
          replacement_risk_category: string | null
          serial_hoist1: string | null
          serial_hoist2: string | null
          serial_number: string | null
          service_class_usage_intensity: string | null
          status: string | null
          structural_design_life_years: number | null
          swl_tonnes: string | null
          trolley_configuration: string | null
          trolley_serial: string | null
          urgent_note: string | null
          year_manufactured: number | null
        }
        Insert: {
          access_suggestion?: string | null
          account_id?: string | null
          account_name?: string | null
          account_num?: string | null
          area_name?: string | null
          asset_created_at?: string | null
          asset_criticality_level?: string | null
          asset_id1?: string | null
          asset_id2?: string | null
          asset_lifecycle_stage?: string | null
          asset_type?: string | null
          barcode?: string | null
          brand_make?: string | null
          capacity?: string | null
          class_name: string
          client_id?: string | null
          commission_date?: string | null
          compliance_status?: string | null
          configuration?: string | null
          control_type?: string | null
          crane_classification?: string | null
          crane_manufacturer?: string | null
          crane_operational_status?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          design_standard?: string | null
          duty_class?: string | null
          environment_exposure?: string | null
          external_id?: string | null
          grade_size?: string | null
          hoist_configuration?: string | null
          hook_type?: string | null
          id?: string
          installation_date?: string | null
          latitude?: number | null
          length_lift?: string | null
          lift_height_m?: number | null
          lifting_medium_hoist1?: string | null
          lifting_medium_hoist2?: string | null
          location_id?: string | null
          location_name?: string | null
          location_num?: string | null
          longitude?: number | null
          major_inspection_due_date?: string | null
          major_inspection_interval_years?: number | null
          manufacturer?: string | null
          manufacturer_hoist1?: string | null
          manufacturer_hoist2?: string | null
          model_hoist1?: string | null
          model_hoist2?: string | null
          model_number?: string | null
          notes?: string | null
          pendant_brand?: string | null
          pendant_remote?: string | null
          power?: string | null
          power_supply?: string | null
          replacement_risk_category?: string | null
          serial_hoist1?: string | null
          serial_hoist2?: string | null
          serial_number?: string | null
          service_class_usage_intensity?: string | null
          status?: string | null
          structural_design_life_years?: number | null
          swl_tonnes?: string | null
          trolley_configuration?: string | null
          trolley_serial?: string | null
          urgent_note?: string | null
          year_manufactured?: number | null
        }
        Update: {
          access_suggestion?: string | null
          account_id?: string | null
          account_name?: string | null
          account_num?: string | null
          area_name?: string | null
          asset_created_at?: string | null
          asset_criticality_level?: string | null
          asset_id1?: string | null
          asset_id2?: string | null
          asset_lifecycle_stage?: string | null
          asset_type?: string | null
          barcode?: string | null
          brand_make?: string | null
          capacity?: string | null
          class_name?: string
          client_id?: string | null
          commission_date?: string | null
          compliance_status?: string | null
          configuration?: string | null
          control_type?: string | null
          crane_classification?: string | null
          crane_manufacturer?: string | null
          crane_operational_status?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          design_standard?: string | null
          duty_class?: string | null
          environment_exposure?: string | null
          external_id?: string | null
          grade_size?: string | null
          hoist_configuration?: string | null
          hook_type?: string | null
          id?: string
          installation_date?: string | null
          latitude?: number | null
          length_lift?: string | null
          lift_height_m?: number | null
          lifting_medium_hoist1?: string | null
          lifting_medium_hoist2?: string | null
          location_id?: string | null
          location_name?: string | null
          location_num?: string | null
          longitude?: number | null
          major_inspection_due_date?: string | null
          major_inspection_interval_years?: number | null
          manufacturer?: string | null
          manufacturer_hoist1?: string | null
          manufacturer_hoist2?: string | null
          model_hoist1?: string | null
          model_hoist2?: string | null
          model_number?: string | null
          notes?: string | null
          pendant_brand?: string | null
          pendant_remote?: string | null
          power?: string | null
          power_supply?: string | null
          replacement_risk_category?: string | null
          serial_hoist1?: string | null
          serial_hoist2?: string | null
          serial_number?: string | null
          service_class_usage_intensity?: string | null
          status?: string | null
          structural_design_life_years?: number | null
          swl_tonnes?: string | null
          trolley_configuration?: string | null
          trolley_serial?: string | null
          urgent_note?: string | null
          year_manufactured?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          contact_email: string | null
          contact_given_name: string | null
          contact_mobile: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_position: string | null
          contact_surname: string | null
          created_at: string
          id: string
          status: string | null
        }
        Insert: {
          client_id: string
          contact_email?: string | null
          contact_given_name?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_position?: string | null
          contact_surname?: string | null
          created_at?: string
          id?: string
          status?: string | null
        }
        Update: {
          client_id?: string
          contact_email?: string | null
          contact_given_name?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_position?: string | null
          contact_surname?: string | null
          created_at?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_name: string
          created_at: string
          created_date: string | null
          id: string
          location_address: string | null
          primary_contact_email: string | null
          primary_contact_given_name: string | null
          primary_contact_mobile: string | null
          primary_contact_name: string | null
          primary_contact_position: string | null
          primary_contact_surname: string | null
          send_schedule_reminders: string | null
          site_induction_details: string | null
          status: string
        }
        Insert: {
          client_name: string
          created_at?: string
          created_date?: string | null
          id?: string
          location_address?: string | null
          primary_contact_email?: string | null
          primary_contact_given_name?: string | null
          primary_contact_mobile?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          primary_contact_surname?: string | null
          send_schedule_reminders?: string | null
          site_induction_details?: string | null
          status?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_date?: string | null
          id?: string
          location_address?: string | null
          primary_contact_email?: string | null
          primary_contact_given_name?: string | null
          primary_contact_mobile?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          primary_contact_surname?: string | null
          send_schedule_reminders?: string | null
          site_induction_details?: string | null
          status?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          is_all_day: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["leave_status"]
          technician_id: string
          technician_name: string
          updated_at: string
          xero_synced: boolean
        }
        Insert: {
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          technician_id: string
          technician_name: string
          updated_at?: string
          xero_synced?: boolean
        }
        Update: {
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          technician_id?: string
          technician_name?: string
          updated_at?: string
          xero_synced?: boolean
        }
        Relationships: []
      }
      quotes: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          client_name: string
          created_at: string
          gst: number
          id: string
          items: Json
          quote_number: string | null
          reminder_sent: boolean
          sent_at: string | null
          site_name: string | null
          status: string
          subtotal: number
          technician_id: string
          technician_name: string
          total: number
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          asset_name?: string | null
          client_name: string
          created_at?: string
          gst?: number
          id?: string
          items?: Json
          quote_number?: string | null
          reminder_sent?: boolean
          sent_at?: string | null
          site_name?: string | null
          status?: string
          subtotal?: number
          technician_id: string
          technician_name: string
          total?: number
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          asset_name?: string | null
          client_name?: string
          created_at?: string
          gst?: number
          id?: string
          items?: Json
          quote_number?: string | null
          reminder_sent?: boolean
          sent_at?: string | null
          site_name?: string | null
          status?: string
          subtotal?: number
          technician_id?: string
          technician_name?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_assessments: {
        Row: {
          ai_executive_summary: string | null
          assessment_type: string
          client_id: string | null
          completed_at: string | null
          completion_method: string
          count_not_yet: number | null
          count_partial: number | null
          created_at: string
          facet_notes: Json
          facet1_score: number | null
          facet2_score: number | null
          facet3_score: number | null
          facet4_score: number | null
          facet5_score: number | null
          facet6_score: number | null
          facet7_score: number | null
          highest_risk_facet: string | null
          id: string
          part_a_answers: Json
          part_b_answers: Json
          site_name: string
          status: string
          strongest_facet: string | null
          technician_id: string | null
          technician_name: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          ai_executive_summary?: string | null
          assessment_type: string
          client_id?: string | null
          completed_at?: string | null
          completion_method: string
          count_not_yet?: number | null
          count_partial?: number | null
          created_at?: string
          facet_notes?: Json
          facet1_score?: number | null
          facet2_score?: number | null
          facet3_score?: number | null
          facet4_score?: number | null
          facet5_score?: number | null
          facet6_score?: number | null
          facet7_score?: number | null
          highest_risk_facet?: string | null
          id?: string
          part_a_answers?: Json
          part_b_answers?: Json
          site_name: string
          status?: string
          strongest_facet?: string | null
          technician_id?: string | null
          technician_name?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          ai_executive_summary?: string | null
          assessment_type?: string
          client_id?: string | null
          completed_at?: string | null
          completion_method?: string
          count_not_yet?: number | null
          count_partial?: number | null
          created_at?: string
          facet_notes?: Json
          facet1_score?: number | null
          facet2_score?: number | null
          facet3_score?: number | null
          facet4_score?: number | null
          facet5_score?: number | null
          facet6_score?: number | null
          facet7_score?: number | null
          highest_risk_facet?: string | null
          id?: string
          part_a_answers?: Json
          part_b_answers?: Json
          site_name?: string
          status?: string
          strongest_facet?: string | null
          technician_id?: string | null
          technician_name?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      star_ratings: {
        Row: {
          asset_name: string | null
          client_name: string
          created_at: string
          id: string
          inspection_id: string | null
          rating: number
          site_name: string | null
          technician_id: string
          technician_name: string
        }
        Insert: {
          asset_name?: string | null
          client_name: string
          created_at?: string
          id?: string
          inspection_id?: string | null
          rating: number
          site_name?: string | null
          technician_id: string
          technician_name: string
        }
        Update: {
          asset_name?: string | null
          client_name?: string
          created_at?: string
          id?: string
          inspection_id?: string | null
          rating?: number
          site_name?: string | null
          technician_id?: string
          technician_name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to_id: string
          assigned_to_name: string
          completed_at: string | null
          created_at: string
          created_by_id: string
          created_by_name: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id: string
          assigned_to_name: string
          completed_at?: string | null
          created_at?: string
          created_by_id: string
          created_by_name: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string
          assigned_to_name?: string
          completed_at?: string | null
          created_at?: string
          created_by_id?: string
          created_by_name?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_name: string | null
          created_at: string
          description: string | null
          end_time: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["time_entry_type"]
          hours: number
          id: string
          inspection_id: string | null
          is_auto_logged: boolean
          site_id: string | null
          start_time: string | null
          technician_id: string
          technician_name: string
          updated_at: string
          xero_synced: boolean
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["time_entry_type"]
          hours: number
          id?: string
          inspection_id?: string | null
          is_auto_logged?: boolean
          site_id?: string | null
          start_time?: string | null
          technician_id: string
          technician_name: string
          updated_at?: string
          xero_synced?: boolean
        }
        Update: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["time_entry_type"]
          hours?: number
          id?: string
          inspection_id?: string | null
          is_auto_logged?: boolean
          site_id?: string | null
          start_time?: string | null
          technician_id?: string
          technician_name?: string
          updated_at?: string
          xero_synced?: boolean
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          created_at: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          technician_id: string
          technician_name: string
          total_hours: number
          updated_at: string
          week_end: string
          week_start: string
          xero_synced: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          technician_id: string
          technician_name: string
          total_hours?: number
          updated_at?: string
          week_end: string
          week_start: string
          xero_synced?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          technician_id?: string
          technician_name?: string
          total_hours?: number
          updated_at?: string
          week_end?: string
          week_start?: string
          xero_synced?: boolean
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
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "annual_leave" | "time_in_lieu" | "sick_leave" | "personal"
      time_entry_type:
        | "inspection"
        | "travel"
        | "repair"
        | "admin"
        | "training"
        | "other"
      timesheet_status: "draft" | "submitted" | "approved" | "rejected"
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
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["annual_leave", "time_in_lieu", "sick_leave", "personal"],
      time_entry_type: [
        "inspection",
        "travel",
        "repair",
        "admin",
        "training",
        "other",
      ],
      timesheet_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const
