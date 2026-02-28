
ALTER TABLE public.tasks
  ADD COLUMN client_name text,
  ADD COLUMN job_type text DEFAULT 'general',
  ADD COLUMN scheduled_date date;
