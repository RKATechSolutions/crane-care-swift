
-- Create the update_updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create repair_jobs table
CREATE TABLE public.repair_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  asset_id uuid REFERENCES public.assets(id),
  asset_name text,
  client_id uuid REFERENCES public.clients(id),
  site_name text,
  technician_id text NOT NULL,
  technician_name text NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'Draft',
  job_type text,
  fault_source text,
  linked_defect_ids text[] DEFAULT '{}',
  asset_status_on_arrival text,
  arrival_status_comment text,
  arrival_status_photos text[] DEFAULT '{}',
  urgency_assessment text,
  customer_reported_issue text,
  work_completed_type text,
  work_comment text,
  parts_replaced boolean DEFAULT false,
  parts_data jsonb DEFAULT '[]',
  functional_testing_completed text,
  functional_testing_checklist jsonb DEFAULT '[]',
  functional_testing_explanation text,
  followup_required boolean DEFAULT false,
  followup_date date,
  diagnosis_summary text,
  recommendation text,
  no_access_reason text,
  no_access_photos text[] DEFAULT '{}',
  defect_closures jsonb DEFAULT '[]',
  return_to_service text,
  return_to_service_explanation text,
  internal_note text,
  internal_photos text[] DEFAULT '{}',
  admin_alert_triggered boolean DEFAULT false,
  admin_alert_reasons text[] DEFAULT '{}'
);

ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view repair jobs" ON public.repair_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert repair jobs" ON public.repair_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update repair jobs" ON public.repair_jobs FOR UPDATE USING (true);

CREATE TRIGGER update_repair_jobs_updated_at
  BEFORE UPDATE ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
