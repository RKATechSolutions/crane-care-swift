
CREATE TABLE public.asset_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  uploaded_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view asset photos" ON public.asset_photos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert asset photos" ON public.asset_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete asset photos" ON public.asset_photos FOR DELETE USING (true);
