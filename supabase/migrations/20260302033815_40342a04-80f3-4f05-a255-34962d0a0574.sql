
-- Create a table for lifting register inspections (pass/fail per item)
CREATE TABLE public.lifting_register_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_item_id UUID NOT NULL REFERENCES public.lifting_register(id),
  client_id UUID REFERENCES public.clients(id),
  site_name TEXT,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result TEXT NOT NULL DEFAULT 'pending', -- pass, fail, pending
  comment TEXT,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lifting_register_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lifting register inspections" ON public.lifting_register_inspections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lifting register inspections" ON public.lifting_register_inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lifting register inspections" ON public.lifting_register_inspections FOR UPDATE USING (true);

CREATE TRIGGER update_lifting_register_inspections_updated_at
  BEFORE UPDATE ON public.lifting_register_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
