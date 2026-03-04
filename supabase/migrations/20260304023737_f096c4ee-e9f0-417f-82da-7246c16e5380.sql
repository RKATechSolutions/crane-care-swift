
-- Add custom fields from AroFlo CSV to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS abn text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS automatic_service_package text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS casual_service_rates text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS comments_or_notes text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_drive_link text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inspectall_account_link text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inspectall_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_or_referral_source text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_days text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_days_and_times text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS priority_service_package text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS required_to_complete_work text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS services_interested_in text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS travel_time_from_base text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS planned_service_dates text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS report_visible_fields jsonb DEFAULT '[]'::jsonb;
