
-- Add new columns to assets table for the field spec
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS swl_tonnes text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS installation_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS major_inspection_due_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_criticality_level text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS crane_operational_status text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS environment_exposure text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS lift_height_m numeric;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS crane_classification text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS design_standard text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS compliance_status text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_class_usage_intensity text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS commission_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS structural_design_life_years integer;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS major_inspection_interval_years integer;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_lifecycle_stage text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS replacement_risk_category text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS brand_make text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS year_manufactured integer;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS duty_class text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS access_suggestion text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS power_supply text;
