
-- Add task_id to time_entries so hours can be linked to a job
ALTER TABLE public.time_entries ADD COLUMN task_id uuid REFERENCES public.tasks(id);
