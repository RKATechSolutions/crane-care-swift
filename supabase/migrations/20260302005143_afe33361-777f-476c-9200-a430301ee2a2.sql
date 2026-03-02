
-- Add defect detail columns to inspection_responses
ALTER TABLE public.inspection_responses
ADD COLUMN IF NOT EXISTS urgency text,
ADD COLUMN IF NOT EXISTS defect_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS advanced_defect_detail text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS internal_note text;
