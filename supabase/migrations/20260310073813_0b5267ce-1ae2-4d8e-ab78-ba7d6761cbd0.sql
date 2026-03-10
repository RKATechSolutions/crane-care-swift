
CREATE TABLE public.defect_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.db_inspections(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  suggestion_type text NOT NULL DEFAULT 'defect_type',
  suggestion_value text NOT NULL,
  suggested_by_id text NOT NULL,
  suggested_by_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.defect_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert defect suggestions" ON public.defect_suggestions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can view defect suggestions" ON public.defect_suggestions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update defect suggestions" ON public.defect_suggestions FOR UPDATE TO public USING (true);
