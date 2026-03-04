
-- Table for storing Crane Culture & Performance Baseline forms
CREATE TABLE public.crane_baselines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id),
  site_name text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  
  -- Section 1: Site & Operations Overview
  company_name text,
  site_location text,
  main_contact_name text,
  role_position text,
  number_of_cranes integer,
  operating_hours_per_day numeric,
  shifts_per_day integer,
  days_per_week integer,
  production_increased text, -- No / Slightly / Significantly

  -- Section 2: Breakdown & Downtime Data
  breakdowns integer,
  avg_downtime numeric,
  longest_downtime numeric,
  avg_response_time numeric,
  scheduled_visits integer,
  emergency_visits integer,
  first_time_fix numeric,
  top_recurring_issues text,

  -- Section 3: Financial Downtime Calculator
  rev_hour numeric,
  labour_cost_per_hour numeric,
  backup_crane text, -- Yes / No

  -- Section 4: Environment & Workplace Standards
  cleanliness_standard text,
  workshop_tidy text,
  environmental_factors text,
  crane_hazards_meetings text,

  -- Section 5: Maintenance & Documentation
  breakdown_response_process text,
  preventative_maintenance text,
  pre_start_inspections text,
  logbooks_updated text,
  findings_reviewed text,
  defects_tracked text,

  -- Section 6: Safety & Load Discipline
  walkways_clear text,
  signage_current text,
  ppe_worn text,
  within_capacity text,
  lifting_register_maintained text,
  load_handling_education text,
  complex_lifts_process text,

  -- Section 7: Education & Training
  total_operators integer,
  refresher_operators integer,
  competency_matrix text,
  supervisors_trained text,
  near_misses_recorded text,
  near_misses_reviewed text,

  -- Section 8: Engineering & Lifecycle
  design_work_period text,
  remaining_service_life text,
  digital_monitoring text,
  capital_forecast text,
  duty_classification_reassessed text,

  -- Section 9: Service Provider Review
  provider_response_time numeric,
  provider_fix_rate numeric,
  reports_electronic text,
  reports_risk_ranking text,
  engineering_advice text,
  lifecycle_planning text,
  value_most text,
  most_frustrating text,
  magic_wand text,

  -- Metadata
  technician_id text,
  technician_name text,
  completed_at timestamp with time zone,
  baseline_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crane_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crane baselines" ON public.crane_baselines FOR SELECT USING (true);
CREATE POLICY "Anyone can insert crane baselines" ON public.crane_baselines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update crane baselines" ON public.crane_baselines FOR UPDATE USING (true);

CREATE TRIGGER update_crane_baselines_updated_at
  BEFORE UPDATE ON public.crane_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
