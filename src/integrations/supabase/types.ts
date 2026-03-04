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
      admin_config: {
        Row: {
          config: Json
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_photos: {
        Row: {
          asset_id: string
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          asset_id: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          asset_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
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
          main_photo_url: string | null
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
          main_photo_url?: string | null
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
          main_photo_url?: string | null
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
          abn: string | null
          automatic_service_package: string | null
          business_type: string | null
          casual_service_rates: string | null
          client_custom_fields: Json
          client_name: string
          comments_or_notes: string | null
          created_at: string
          created_date: string | null
          google_drive_link: string | null
          id: string
          inspectall_account_link: string | null
          inspectall_code: string | null
          lead_or_referral_source: string | null
          location_address: string | null
          payment_days: string | null
          planned_service_dates: string | null
          preferred_days_and_times: string | null
          primary_contact_email: string | null
          primary_contact_given_name: string | null
          primary_contact_mobile: string | null
          primary_contact_name: string | null
          primary_contact_position: string | null
          primary_contact_surname: string | null
          priority_service_package: string | null
          report_visible_fields: Json | null
          required_to_complete_work: string | null
          send_schedule_reminders: string | null
          services_interested_in: string | null
          site_induction_details: string | null
          status: string
          travel_time_from_base: string | null
        }
        Insert: {
          abn?: string | null
          automatic_service_package?: string | null
          business_type?: string | null
          casual_service_rates?: string | null
          client_custom_fields?: Json
          client_name: string
          comments_or_notes?: string | null
          created_at?: string
          created_date?: string | null
          google_drive_link?: string | null
          id?: string
          inspectall_account_link?: string | null
          inspectall_code?: string | null
          lead_or_referral_source?: string | null
          location_address?: string | null
          payment_days?: string | null
          planned_service_dates?: string | null
          preferred_days_and_times?: string | null
          primary_contact_email?: string | null
          primary_contact_given_name?: string | null
          primary_contact_mobile?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          primary_contact_surname?: string | null
          priority_service_package?: string | null
          report_visible_fields?: Json | null
          required_to_complete_work?: string | null
          send_schedule_reminders?: string | null
          services_interested_in?: string | null
          site_induction_details?: string | null
          status?: string
          travel_time_from_base?: string | null
        }
        Update: {
          abn?: string | null
          automatic_service_package?: string | null
          business_type?: string | null
          casual_service_rates?: string | null
          client_custom_fields?: Json
          client_name?: string
          comments_or_notes?: string | null
          created_at?: string
          created_date?: string | null
          google_drive_link?: string | null
          id?: string
          inspectall_account_link?: string | null
          inspectall_code?: string | null
          lead_or_referral_source?: string | null
          location_address?: string | null
          payment_days?: string | null
          planned_service_dates?: string | null
          preferred_days_and_times?: string | null
          primary_contact_email?: string | null
          primary_contact_given_name?: string | null
          primary_contact_mobile?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          primary_contact_surname?: string | null
          priority_service_package?: string | null
          report_visible_fields?: Json | null
          required_to_complete_work?: string | null
          send_schedule_reminders?: string | null
          services_interested_in?: string | null
          site_induction_details?: string | null
          status?: string
          travel_time_from_base?: string | null
        }
        Relationships: []
      }
      crane_baselines: {
        Row: {
          ai_summary: string | null
          avg_downtime: number | null
          avg_response_time: number | null
          backup_crane: string | null
          baseline_date: string | null
          breakdown_response_process: string | null
          breakdowns: number | null
          capital_forecast: string | null
          cleanliness_standard: string | null
          client_id: string | null
          company_name: string | null
          competency_matrix: string | null
          completed_at: string | null
          complex_lifts_process: string | null
          crane_hazards_meetings: string | null
          created_at: string
          days_per_week: number | null
          defects_tracked: string | null
          design_work_period: string | null
          digital_monitoring: string | null
          duty_classification_reassessed: string | null
          emergency_visits: number | null
          engineering_advice: string | null
          environmental_factors: string | null
          findings_reviewed: string | null
          first_time_fix: number | null
          id: string
          labour_cost_per_hour: number | null
          lifecycle_planning: string | null
          lifting_register_maintained: string | null
          load_handling_education: string | null
          logbooks_updated: string | null
          longest_downtime: number | null
          magic_wand: string | null
          main_contact_name: string | null
          most_frustrating: string | null
          near_misses_recorded: string | null
          near_misses_reviewed: string | null
          number_of_cranes: number | null
          operating_hours_per_day: number | null
          ppe_worn: string | null
          pre_start_inspections: string | null
          preventative_maintenance: string | null
          production_increased: string | null
          provider_fix_rate: number | null
          provider_response_time: number | null
          refresher_operators: number | null
          remaining_service_life: string | null
          reports_electronic: string | null
          reports_risk_ranking: string | null
          rev_hour: number | null
          role_position: string | null
          scheduled_visits: number | null
          shifts_per_day: number | null
          signage_current: string | null
          site_location: string | null
          site_name: string
          status: string
          supervisors_trained: string | null
          technician_id: string | null
          technician_name: string | null
          top_recurring_issues: string | null
          total_operators: number | null
          updated_at: string
          value_most: string | null
          walkways_clear: string | null
          within_capacity: string | null
          workshop_tidy: string | null
        }
        Insert: {
          ai_summary?: string | null
          avg_downtime?: number | null
          avg_response_time?: number | null
          backup_crane?: string | null
          baseline_date?: string | null
          breakdown_response_process?: string | null
          breakdowns?: number | null
          capital_forecast?: string | null
          cleanliness_standard?: string | null
          client_id?: string | null
          company_name?: string | null
          competency_matrix?: string | null
          completed_at?: string | null
          complex_lifts_process?: string | null
          crane_hazards_meetings?: string | null
          created_at?: string
          days_per_week?: number | null
          defects_tracked?: string | null
          design_work_period?: string | null
          digital_monitoring?: string | null
          duty_classification_reassessed?: string | null
          emergency_visits?: number | null
          engineering_advice?: string | null
          environmental_factors?: string | null
          findings_reviewed?: string | null
          first_time_fix?: number | null
          id?: string
          labour_cost_per_hour?: number | null
          lifecycle_planning?: string | null
          lifting_register_maintained?: string | null
          load_handling_education?: string | null
          logbooks_updated?: string | null
          longest_downtime?: number | null
          magic_wand?: string | null
          main_contact_name?: string | null
          most_frustrating?: string | null
          near_misses_recorded?: string | null
          near_misses_reviewed?: string | null
          number_of_cranes?: number | null
          operating_hours_per_day?: number | null
          ppe_worn?: string | null
          pre_start_inspections?: string | null
          preventative_maintenance?: string | null
          production_increased?: string | null
          provider_fix_rate?: number | null
          provider_response_time?: number | null
          refresher_operators?: number | null
          remaining_service_life?: string | null
          reports_electronic?: string | null
          reports_risk_ranking?: string | null
          rev_hour?: number | null
          role_position?: string | null
          scheduled_visits?: number | null
          shifts_per_day?: number | null
          signage_current?: string | null
          site_location?: string | null
          site_name: string
          status?: string
          supervisors_trained?: string | null
          technician_id?: string | null
          technician_name?: string | null
          top_recurring_issues?: string | null
          total_operators?: number | null
          updated_at?: string
          value_most?: string | null
          walkways_clear?: string | null
          within_capacity?: string | null
          workshop_tidy?: string | null
        }
        Update: {
          ai_summary?: string | null
          avg_downtime?: number | null
          avg_response_time?: number | null
          backup_crane?: string | null
          baseline_date?: string | null
          breakdown_response_process?: string | null
          breakdowns?: number | null
          capital_forecast?: string | null
          cleanliness_standard?: string | null
          client_id?: string | null
          company_name?: string | null
          competency_matrix?: string | null
          completed_at?: string | null
          complex_lifts_process?: string | null
          crane_hazards_meetings?: string | null
          created_at?: string
          days_per_week?: number | null
          defects_tracked?: string | null
          design_work_period?: string | null
          digital_monitoring?: string | null
          duty_classification_reassessed?: string | null
          emergency_visits?: number | null
          engineering_advice?: string | null
          environmental_factors?: string | null
          findings_reviewed?: string | null
          first_time_fix?: number | null
          id?: string
          labour_cost_per_hour?: number | null
          lifecycle_planning?: string | null
          lifting_register_maintained?: string | null
          load_handling_education?: string | null
          logbooks_updated?: string | null
          longest_downtime?: number | null
          magic_wand?: string | null
          main_contact_name?: string | null
          most_frustrating?: string | null
          near_misses_recorded?: string | null
          near_misses_reviewed?: string | null
          number_of_cranes?: number | null
          operating_hours_per_day?: number | null
          ppe_worn?: string | null
          pre_start_inspections?: string | null
          preventative_maintenance?: string | null
          production_increased?: string | null
          provider_fix_rate?: number | null
          provider_response_time?: number | null
          refresher_operators?: number | null
          remaining_service_life?: string | null
          reports_electronic?: string | null
          reports_risk_ranking?: string | null
          rev_hour?: number | null
          role_position?: string | null
          scheduled_visits?: number | null
          shifts_per_day?: number | null
          signage_current?: string | null
          site_location?: string | null
          site_name?: string
          status?: string
          supervisors_trained?: string | null
          technician_id?: string | null
          technician_name?: string | null
          top_recurring_issues?: string | null
          total_operators?: number | null
          updated_at?: string
          value_most?: string | null
          walkways_clear?: string | null
          within_capacity?: string | null
          workshop_tidy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crane_baselines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      db_inspections: {
        Row: {
          ai_12_month_plan: string | null
          ai_summary: string | null
          asset_id: string | null
          asset_name: string | null
          client_id: string | null
          crane_status: string | null
          created_at: string
          customer_name: string | null
          customer_signature: string | null
          form_id: string
          id: string
          inspection_date: string
          inspection_type: string
          other_notes: string | null
          site_name: string | null
          status: string
          task_id: string | null
          technician_id: string
          technician_name: string
          technician_signature: string | null
          updated_at: string
        }
        Insert: {
          ai_12_month_plan?: string | null
          ai_summary?: string | null
          asset_id?: string | null
          asset_name?: string | null
          client_id?: string | null
          crane_status?: string | null
          created_at?: string
          customer_name?: string | null
          customer_signature?: string | null
          form_id: string
          id?: string
          inspection_date?: string
          inspection_type?: string
          other_notes?: string | null
          site_name?: string | null
          status?: string
          task_id?: string | null
          technician_id: string
          technician_name: string
          technician_signature?: string | null
          updated_at?: string
        }
        Update: {
          ai_12_month_plan?: string | null
          ai_summary?: string | null
          asset_id?: string | null
          asset_name?: string | null
          client_id?: string | null
          crane_status?: string | null
          created_at?: string
          customer_name?: string | null
          customer_signature?: string | null
          form_id?: string
          id?: string
          inspection_date?: string
          inspection_type?: string
          other_notes?: string | null
          site_name?: string | null
          status?: string
          task_id?: string | null
          technician_id?: string
          technician_name?: string
          technician_signature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_inspections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_inspections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_inspections_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "db_inspections_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_questions: {
        Row: {
          conditional_rule: string | null
          created_at: string
          form_id: string
          id: string
          override_help_text: string | null
          override_sort_order: number | null
          override_standard_ref: string | null
          question_id: string
          required: boolean
          section_override: string | null
          sub_heading: string | null
        }
        Insert: {
          conditional_rule?: string | null
          created_at?: string
          form_id: string
          id?: string
          override_help_text?: string | null
          override_sort_order?: number | null
          override_standard_ref?: string | null
          question_id: string
          required?: boolean
          section_override?: string | null
          sub_heading?: string | null
        }
        Update: {
          conditional_rule?: string | null
          created_at?: string
          form_id?: string
          id?: string
          override_help_text?: string | null
          override_sort_order?: number | null
          override_standard_ref?: string | null
          question_id?: string
          required?: boolean
          section_override?: string | null
          sub_heading?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_template_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "form_template_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_library"
            referencedColumns: ["question_id"]
          },
        ]
      }
      form_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          form_id: string
          form_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          form_id: string
          form_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          form_id?: string
          form_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_responses: {
        Row: {
          advanced_defect_detail: string[] | null
          answer_value: string | null
          comment: string | null
          created_at: string
          defect_flag: boolean
          defect_types: string[] | null
          id: string
          inspection_id: string
          internal_note: string | null
          pass_fail_status: string | null
          photo_urls: string[] | null
          question_id: string
          severity: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          advanced_defect_detail?: string[] | null
          answer_value?: string | null
          comment?: string | null
          created_at?: string
          defect_flag?: boolean
          defect_types?: string[] | null
          id?: string
          inspection_id: string
          internal_note?: string | null
          pass_fail_status?: string | null
          photo_urls?: string[] | null
          question_id: string
          severity?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          advanced_defect_detail?: string[] | null
          answer_value?: string | null
          comment?: string | null
          created_at?: string
          defect_flag?: boolean
          defect_types?: string[] | null
          id?: string
          inspection_id?: string
          internal_note?: string | null
          pass_fail_status?: string | null
          photo_urls?: string[] | null
          question_id?: string
          severity?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "db_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_library"
            referencedColumns: ["question_id"]
          },
        ]
      }
      job_costs: {
        Row: {
          cost_type: string
          created_at: string
          description: string
          id: string
          quantity: number
          sell_price: number | null
          supplier: string | null
          task_id: string
          total: number | null
          unit_cost: number
        }
        Insert: {
          cost_type?: string
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sell_price?: number | null
          supplier?: string | null
          task_id: string
          total?: number | null
          unit_cost?: number
        }
        Update: {
          cost_type?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sell_price?: number | null
          supplier?: string | null
          task_id?: string
          total?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_costs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      job_documents: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notes: {
        Row: {
          author: string
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          task_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      lifting_register: {
        Row: {
          ai_confidence_summary: Json | null
          ai_scan_timestamp: string | null
          ai_scan_used: boolean | null
          asset_tag: string | null
          client_id: string | null
          confirmed_by_id: string | null
          confirmed_by_name: string | null
          created_at: string
          equipment_status: string | null
          equipment_type: string
          grade: string | null
          id: string
          length_m: number | null
          lift_height_m: number | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          overall_photo_url: string | null
          registered_by_id: string
          registered_by_name: string
          serial_number: string | null
          site_name: string | null
          sling_configuration: string | null
          sling_leg_count: number | null
          span_m: number | null
          stamp_photo_url: string | null
          tag_photo_url: string | null
          tag_present: string | null
          updated_at: string
          wll_unit: string | null
          wll_value: number | null
        }
        Insert: {
          ai_confidence_summary?: Json | null
          ai_scan_timestamp?: string | null
          ai_scan_used?: boolean | null
          asset_tag?: string | null
          client_id?: string | null
          confirmed_by_id?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          equipment_status?: string | null
          equipment_type: string
          grade?: string | null
          id?: string
          length_m?: number | null
          lift_height_m?: number | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          overall_photo_url?: string | null
          registered_by_id: string
          registered_by_name: string
          serial_number?: string | null
          site_name?: string | null
          sling_configuration?: string | null
          sling_leg_count?: number | null
          span_m?: number | null
          stamp_photo_url?: string | null
          tag_photo_url?: string | null
          tag_present?: string | null
          updated_at?: string
          wll_unit?: string | null
          wll_value?: number | null
        }
        Update: {
          ai_confidence_summary?: Json | null
          ai_scan_timestamp?: string | null
          ai_scan_used?: boolean | null
          asset_tag?: string | null
          client_id?: string | null
          confirmed_by_id?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          equipment_status?: string | null
          equipment_type?: string
          grade?: string | null
          id?: string
          length_m?: number | null
          lift_height_m?: number | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          overall_photo_url?: string | null
          registered_by_id?: string
          registered_by_name?: string
          serial_number?: string | null
          site_name?: string | null
          sling_configuration?: string | null
          sling_leg_count?: number | null
          span_m?: number | null
          stamp_photo_url?: string | null
          tag_photo_url?: string | null
          tag_present?: string | null
          updated_at?: string
          wll_unit?: string | null
          wll_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifting_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lifting_register_inspections: {
        Row: {
          client_id: string | null
          comment: string | null
          created_at: string
          id: string
          inspection_date: string
          photo_urls: string[] | null
          register_item_id: string
          result: string
          site_name: string | null
          technician_id: string
          technician_name: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          inspection_date?: string
          photo_urls?: string[] | null
          register_item_id: string
          result?: string
          site_name?: string | null
          technician_id: string
          technician_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          inspection_date?: string
          photo_urls?: string[] | null
          register_item_id?: string
          result?: string
          site_name?: string | null
          technician_id?: string
          technician_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifting_register_inspections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifting_register_inspections_register_item_id_fkey"
            columns: ["register_item_id"]
            isOneToOne: false
            referencedRelation: "lifting_register"
            referencedColumns: ["id"]
          },
        ]
      }
      lifting_register_scans: {
        Row: {
          ai_raw_response: Json | null
          created_at: string
          fields_accepted: Json | null
          fields_discarded: Json | null
          fields_edited: Json | null
          id: string
          overall_confidence: number | null
          photos: Json | null
          register_id: string | null
          technician_id: string
          technician_name: string
        }
        Insert: {
          ai_raw_response?: Json | null
          created_at?: string
          fields_accepted?: Json | null
          fields_discarded?: Json | null
          fields_edited?: Json | null
          id?: string
          overall_confidence?: number | null
          photos?: Json | null
          register_id?: string | null
          technician_id: string
          technician_name: string
        }
        Update: {
          ai_raw_response?: Json | null
          created_at?: string
          fields_accepted?: Json | null
          fields_discarded?: Json | null
          fields_edited?: Json | null
          id?: string
          overall_confidence?: number | null
          photos?: Json | null
          register_id?: string | null
          technician_id?: string
          technician_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifting_register_scans_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "lifting_register"
            referencedColumns: ["id"]
          },
        ]
      }
      question_library: {
        Row: {
          active: boolean
          advanced_defect_options: string[] | null
          answer_type: string
          asset_types: string[]
          auto_defect_types: string[] | null
          category: string
          created_at: string
          help_text: string | null
          id: string
          optional_comment: boolean
          optional_photo: boolean
          options: string[] | null
          question_id: string
          question_text: string
          requires_comment_on_fail: boolean
          requires_photo_on_fail: boolean
          section: string
          severity_required_on_fail: boolean
          sort_order: number
          standard_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          advanced_defect_options?: string[] | null
          answer_type?: string
          asset_types?: string[]
          auto_defect_types?: string[] | null
          category?: string
          created_at?: string
          help_text?: string | null
          id?: string
          optional_comment?: boolean
          optional_photo?: boolean
          options?: string[] | null
          question_id: string
          question_text: string
          requires_comment_on_fail?: boolean
          requires_photo_on_fail?: boolean
          section?: string
          severity_required_on_fail?: boolean
          sort_order?: number
          standard_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          advanced_defect_options?: string[] | null
          answer_type?: string
          asset_types?: string[]
          auto_defect_types?: string[] | null
          category?: string
          created_at?: string
          help_text?: string | null
          id?: string
          optional_comment?: boolean
          optional_photo?: boolean
          options?: string[] | null
          question_id?: string
          question_text?: string
          requires_comment_on_fail?: boolean
          requires_photo_on_fail?: boolean
          section?: string
          severity_required_on_fail?: boolean
          sort_order?: number
          standard_ref?: string | null
          updated_at?: string
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
      receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          id: string
          merchant_name: string | null
          notes: string | null
          photo_url: string
          receipt_date: string | null
          status: string
          technician_id: string
          technician_name: string
          updated_at: string
          xero_synced: boolean
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          merchant_name?: string | null
          notes?: string | null
          photo_url: string
          receipt_date?: string | null
          status?: string
          technician_id: string
          technician_name: string
          updated_at?: string
          xero_synced?: boolean
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          merchant_name?: string | null
          notes?: string | null
          photo_url?: string
          receipt_date?: string | null
          status?: string
          technician_id?: string
          technician_name?: string
          updated_at?: string
          xero_synced?: boolean
        }
        Relationships: []
      }
      repair_jobs: {
        Row: {
          admin_alert_reasons: string[] | null
          admin_alert_triggered: boolean | null
          arrival_status_comment: string | null
          arrival_status_photos: string[] | null
          asset_id: string | null
          asset_name: string | null
          asset_status_on_arrival: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          customer_reported_issue: string | null
          defect_closures: Json | null
          diagnosis_summary: string | null
          fault_source: string | null
          followup_date: string | null
          followup_required: boolean | null
          functional_testing_checklist: Json | null
          functional_testing_completed: string | null
          functional_testing_explanation: string | null
          id: string
          internal_note: string | null
          internal_photos: string[] | null
          job_type: string | null
          linked_defect_ids: string[] | null
          no_access_photos: string[] | null
          no_access_reason: string | null
          parts_data: Json | null
          parts_replaced: boolean | null
          recommendation: string | null
          return_to_service: string | null
          return_to_service_explanation: string | null
          site_name: string | null
          started_at: string | null
          status: string
          task_id: string | null
          technician_id: string
          technician_name: string
          updated_at: string
          urgency_assessment: string | null
          work_comment: string | null
          work_completed_type: string | null
        }
        Insert: {
          admin_alert_reasons?: string[] | null
          admin_alert_triggered?: boolean | null
          arrival_status_comment?: string | null
          arrival_status_photos?: string[] | null
          asset_id?: string | null
          asset_name?: string | null
          asset_status_on_arrival?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_reported_issue?: string | null
          defect_closures?: Json | null
          diagnosis_summary?: string | null
          fault_source?: string | null
          followup_date?: string | null
          followup_required?: boolean | null
          functional_testing_checklist?: Json | null
          functional_testing_completed?: string | null
          functional_testing_explanation?: string | null
          id?: string
          internal_note?: string | null
          internal_photos?: string[] | null
          job_type?: string | null
          linked_defect_ids?: string[] | null
          no_access_photos?: string[] | null
          no_access_reason?: string | null
          parts_data?: Json | null
          parts_replaced?: boolean | null
          recommendation?: string | null
          return_to_service?: string | null
          return_to_service_explanation?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: string
          task_id?: string | null
          technician_id: string
          technician_name: string
          updated_at?: string
          urgency_assessment?: string | null
          work_comment?: string | null
          work_completed_type?: string | null
        }
        Update: {
          admin_alert_reasons?: string[] | null
          admin_alert_triggered?: boolean | null
          arrival_status_comment?: string | null
          arrival_status_photos?: string[] | null
          asset_id?: string | null
          asset_name?: string | null
          asset_status_on_arrival?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_reported_issue?: string | null
          defect_closures?: Json | null
          diagnosis_summary?: string | null
          fault_source?: string | null
          followup_date?: string | null
          followup_required?: boolean | null
          functional_testing_checklist?: Json | null
          functional_testing_completed?: string | null
          functional_testing_explanation?: string | null
          id?: string
          internal_note?: string | null
          internal_photos?: string[] | null
          job_type?: string | null
          linked_defect_ids?: string[] | null
          no_access_photos?: string[] | null
          no_access_reason?: string | null
          parts_data?: Json | null
          parts_replaced?: boolean | null
          recommendation?: string | null
          return_to_service?: string | null
          return_to_service_explanation?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: string
          task_id?: string | null
          technician_id?: string
          technician_name?: string
          updated_at?: string
          urgency_assessment?: string | null
          work_comment?: string | null
          work_completed_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_jobs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
          client_name: string | null
          completed_at: string | null
          created_at: string
          created_by_id: string
          created_by_name: string
          description: string | null
          due_date: string | null
          id: string
          job_type: string | null
          priority: string
          quote_id: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id: string
          assigned_to_name: string
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id: string
          created_by_name: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_type?: string | null
          priority?: string
          quote_id?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string
          assigned_to_name?: string
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id?: string
          created_by_name?: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_type?: string | null
          priority?: string
          quote_id?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
          task_id: string | null
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
          task_id?: string | null
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
          task_id?: string | null
          technician_id?: string
          technician_name?: string
          updated_at?: string
          xero_synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
