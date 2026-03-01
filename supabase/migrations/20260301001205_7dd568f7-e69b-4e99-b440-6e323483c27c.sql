
-- Job Costs table
CREATE TABLE public.job_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier text,
  total numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view job costs" ON public.job_costs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert job costs" ON public.job_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update job costs" ON public.job_costs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete job costs" ON public.job_costs FOR DELETE USING (true);

-- Job Notes table
CREATE TABLE public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  author text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view job notes" ON public.job_notes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert job notes" ON public.job_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete job notes" ON public.job_notes FOR DELETE USING (true);

-- Job Documents table
CREATE TABLE public.job_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view job documents" ON public.job_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert job documents" ON public.job_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete job documents" ON public.job_documents FOR DELETE USING (true);

-- Storage bucket for job documents
INSERT INTO storage.buckets (id, name, public) VALUES ('job-documents', 'job-documents', true);

CREATE POLICY "Anyone can upload job documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'job-documents');
CREATE POLICY "Anyone can view job documents files" ON storage.objects FOR SELECT USING (bucket_id = 'job-documents');
CREATE POLICY "Anyone can delete job documents files" ON storage.objects FOR DELETE USING (bucket_id = 'job-documents');
