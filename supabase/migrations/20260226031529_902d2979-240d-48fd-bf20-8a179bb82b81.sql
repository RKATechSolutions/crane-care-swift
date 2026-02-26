
-- Create site assessments table for 7-Facet Site & Lifting Operations Assessment
CREATE TABLE public.site_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id),
  site_name text NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('Initial Site Baseline', '12-Month Review')),
  completion_method text NOT NULL CHECK (completion_method IN ('Customer Pre-Completed', 'Completed On Site with Customer', 'Completed Internally')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  
  -- Part A: Pre-Site Questionnaire answers (JSON object: question_id -> score 0/1/2)
  part_a_answers jsonb NOT NULL DEFAULT '{}',
  
  -- Part B: Technician Assessment answers (JSON object: question_id -> score 0/1/2)
  part_b_answers jsonb NOT NULL DEFAULT '{}',
  
  -- Part B: Key notes per facet
  facet_notes jsonb NOT NULL DEFAULT '{}',
  
  -- Calculated scores
  facet1_score integer DEFAULT 0,
  facet2_score integer DEFAULT 0,
  facet3_score integer DEFAULT 0,
  facet4_score integer DEFAULT 0,
  facet5_score integer DEFAULT 0,
  facet6_score integer DEFAULT 0,
  facet7_score integer DEFAULT 0,
  total_score integer DEFAULT 0,
  count_not_yet integer DEFAULT 0,
  count_partial integer DEFAULT 0,
  highest_risk_facet text,
  strongest_facet text,
  
  -- AI Generated summary
  ai_executive_summary text,
  
  -- Metadata
  technician_id text,
  technician_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site assessments" ON public.site_assessments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert site assessments" ON public.site_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update site assessments" ON public.site_assessments FOR UPDATE USING (true);
