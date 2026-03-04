
-- Add task_id to db_inspections to scope forms to a scheduled job
ALTER TABLE public.db_inspections
ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Index for fast lookup by task
CREATE INDEX idx_db_inspections_task_id ON public.db_inspections(task_id);

-- Also add task_id to repair_jobs for the same scoping
ALTER TABLE public.repair_jobs
ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_repair_jobs_task_id ON public.repair_jobs(task_id);
