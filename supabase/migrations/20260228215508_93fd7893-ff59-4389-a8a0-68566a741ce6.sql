
-- ============================================
-- TABLE A: question_library (master source of truth)
-- ============================================
CREATE TABLE public.question_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'General',
  asset_types text[] NOT NULL DEFAULT '{}',
  section text NOT NULL DEFAULT '',
  question_text text NOT NULL,
  help_text text,
  standard_ref text,
  answer_type text NOT NULL DEFAULT 'PassFailNA',
  options text[] DEFAULT NULL,
  requires_photo_on_fail boolean NOT NULL DEFAULT false,
  requires_comment_on_fail boolean NOT NULL DEFAULT true,
  severity_required_on_fail boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE B: form_templates
-- ============================================
CREATE TABLE public.form_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id text NOT NULL UNIQUE,
  form_name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE C: form_template_questions (bridge)
-- ============================================
CREATE TABLE public.form_template_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id text NOT NULL REFERENCES public.form_templates(form_id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES public.question_library(question_id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT true,
  conditional_rule text,
  override_help_text text,
  override_standard_ref text,
  override_sort_order integer,
  section_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, question_id)
);

-- ============================================
-- TABLE D: inspections (DB-driven)
-- ============================================
CREATE TABLE public.db_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id text NOT NULL REFERENCES public.form_templates(form_id),
  client_id uuid REFERENCES public.clients(id),
  site_name text,
  asset_id uuid REFERENCES public.assets(id),
  asset_name text,
  inspection_type text NOT NULL DEFAULT 'Periodic',
  technician_id text NOT NULL,
  technician_name text NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft',
  crane_status text,
  ai_summary text,
  ai_12_month_plan text,
  customer_name text,
  customer_signature text,
  technician_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE E: inspection_responses
-- ============================================
CREATE TABLE public.inspection_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id uuid NOT NULL REFERENCES public.db_inspections(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES public.question_library(question_id),
  answer_value text,
  pass_fail_status text,
  severity text,
  comment text,
  photo_urls text[],
  defect_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inspection_id, question_id)
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.question_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;

-- question_library: readable by all, editable by all (admin gating in app)
CREATE POLICY "Anyone can view questions" ON public.question_library FOR SELECT USING (true);
CREATE POLICY "Anyone can insert questions" ON public.question_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update questions" ON public.question_library FOR UPDATE USING (true);

-- form_templates: readable by all, editable by all
CREATE POLICY "Anyone can view form templates" ON public.form_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert form templates" ON public.form_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update form templates" ON public.form_templates FOR UPDATE USING (true);

-- form_template_questions: readable by all, editable by all
CREATE POLICY "Anyone can view form template questions" ON public.form_template_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert form template questions" ON public.form_template_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update form template questions" ON public.form_template_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete form template questions" ON public.form_template_questions FOR DELETE USING (true);

-- db_inspections: readable by all, editable by all
CREATE POLICY "Anyone can view db inspections" ON public.db_inspections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert db inspections" ON public.db_inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update db inspections" ON public.db_inspections FOR UPDATE USING (true);

-- inspection_responses: readable by all, editable by all
CREATE POLICY "Anyone can view inspection responses" ON public.inspection_responses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inspection responses" ON public.inspection_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inspection responses" ON public.inspection_responses FOR UPDATE USING (true);

-- Indexes for performance
CREATE INDEX idx_question_library_category ON public.question_library(category);
CREATE INDEX idx_question_library_section ON public.question_library(section);
CREATE INDEX idx_form_template_questions_form_id ON public.form_template_questions(form_id);
CREATE INDEX idx_inspection_responses_inspection_id ON public.inspection_responses(inspection_id);
CREATE INDEX idx_db_inspections_form_id ON public.db_inspections(form_id);
CREATE INDEX idx_db_inspections_status ON public.db_inspections(status);
