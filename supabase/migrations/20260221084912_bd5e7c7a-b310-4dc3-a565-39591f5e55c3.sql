
-- Create assets table to store all equipment/crane data
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  class_name TEXT NOT NULL,
  asset_id1 TEXT,
  asset_id2 TEXT,
  status TEXT DEFAULT 'In Service',
  account_id TEXT,
  account_name TEXT,
  account_num TEXT,
  location_id TEXT,
  location_name TEXT,
  location_num TEXT,
  area_name TEXT,
  description TEXT,
  urgent_note TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  asset_created_at TEXT,
  created_by_id TEXT,
  -- Common fields across types
  asset_type TEXT,
  capacity TEXT,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  length_lift TEXT,
  -- Overhead crane specific
  power TEXT,
  pendant_remote TEXT,
  crane_manufacturer TEXT,
  hoist_configuration TEXT,
  trolley_configuration TEXT,
  lifting_medium_hoist1 TEXT,
  manufacturer_hoist1 TEXT,
  model_hoist1 TEXT,
  serial_hoist1 TEXT,
  lifting_medium_hoist2 TEXT,
  manufacturer_hoist2 TEXT,
  model_hoist2 TEXT,
  serial_hoist2 TEXT,
  control_type TEXT,
  pendant_brand TEXT,
  trolley_serial TEXT,
  -- Chain sling specific
  configuration TEXT,
  grade_size TEXT,
  -- Hook type for boom cranes
  hook_type TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_id UUID REFERENCES public.clients(id)
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Anyone can view assets"
ON public.assets FOR SELECT
USING (true);

-- Allow insert
CREATE POLICY "Allow insert assets"
ON public.assets FOR INSERT
WITH CHECK (true);

-- Allow update
CREATE POLICY "Allow update assets"
ON public.assets FOR UPDATE
USING (true);

-- Index for fast client lookup
CREATE INDEX idx_assets_account_name ON public.assets(account_name);
CREATE INDEX idx_assets_client_id ON public.assets(client_id);
CREATE INDEX idx_assets_class_name ON public.assets(class_name);
