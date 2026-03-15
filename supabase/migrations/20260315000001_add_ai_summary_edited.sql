-- Track when AI summary has been manually edited by technician
ALTER TABLE public.db_inspections ADD COLUMN IF NOT EXISTS ai_summary_edited boolean DEFAULT false;
