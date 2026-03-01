
-- Add cost_type column to distinguish materials from labour
ALTER TABLE public.job_costs ADD COLUMN cost_type text NOT NULL DEFAULT 'material';
