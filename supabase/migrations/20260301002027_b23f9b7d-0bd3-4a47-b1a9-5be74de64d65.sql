
-- Add quote_id to tasks so accepted quotes link to jobs
ALTER TABLE public.tasks ADD COLUMN quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX idx_tasks_quote_id ON public.tasks(quote_id);
