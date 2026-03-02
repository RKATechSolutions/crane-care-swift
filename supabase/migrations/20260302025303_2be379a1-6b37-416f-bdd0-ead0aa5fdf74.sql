
-- Lifting Equipment Register table
CREATE TABLE public.lifting_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id),
  site_name TEXT,
  equipment_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  asset_tag TEXT,
  wll_value NUMERIC,
  wll_unit TEXT DEFAULT 'kg',
  length_m NUMERIC,
  grade TEXT,
  tag_present TEXT DEFAULT 'unknown',
  equipment_status TEXT DEFAULT 'In Service',
  -- Sling-specific
  sling_configuration TEXT,
  sling_leg_count INTEGER,
  -- Hoist-specific
  lift_height_m NUMERIC,
  -- Beam/Spreader-specific
  span_m NUMERIC,
  -- AI scan metadata
  ai_scan_used BOOLEAN DEFAULT false,
  ai_scan_timestamp TIMESTAMPTZ,
  ai_confidence_summary JSONB DEFAULT '{}',
  -- Photo URLs
  tag_photo_url TEXT,
  overall_photo_url TEXT,
  stamp_photo_url TEXT,
  notes TEXT,
  -- Audit
  registered_by_id TEXT NOT NULL,
  registered_by_name TEXT NOT NULL,
  confirmed_by_id TEXT,
  confirmed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lifting_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lifting register" ON public.lifting_register FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lifting register" ON public.lifting_register FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lifting register" ON public.lifting_register FOR UPDATE USING (true);

-- Audit log for AI scan confirmations
CREATE TABLE public.lifting_register_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES public.lifting_register(id),
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  photos JSONB DEFAULT '[]',
  ai_raw_response JSONB DEFAULT '{}',
  fields_accepted JSONB DEFAULT '[]',
  fields_edited JSONB DEFAULT '[]',
  fields_discarded JSONB DEFAULT '[]',
  overall_confidence INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lifting_register_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lifting register scans" ON public.lifting_register_scans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lifting register scans" ON public.lifting_register_scans FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_lifting_register_updated_at
  BEFORE UPDATE ON public.lifting_register
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
