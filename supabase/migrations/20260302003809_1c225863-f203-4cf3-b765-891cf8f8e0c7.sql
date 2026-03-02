
-- Add auto_defect_types and advanced_defect_options to question_library
ALTER TABLE public.question_library
ADD COLUMN IF NOT EXISTS auto_defect_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS advanced_defect_options text[] DEFAULT '{}';

-- Add urgency_options column to support per-question urgency levels
-- (using the global standard: Immediate, Urgent, Scheduled, Monitor)
