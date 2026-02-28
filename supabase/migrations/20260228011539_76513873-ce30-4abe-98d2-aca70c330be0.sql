
-- Quotes table to track all quotes created by technicians
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id text NOT NULL,
  technician_name text NOT NULL,
  client_name text NOT NULL,
  site_name text,
  asset_name text,
  asset_id text,
  quote_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  gst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_sent',
  sent_at timestamp with time zone,
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quotes" ON public.quotes FOR UPDATE USING (true);

-- Star ratings table to track 5-star sign-offs
CREATE TABLE public.star_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id text NOT NULL,
  technician_name text NOT NULL,
  client_name text NOT NULL,
  site_name text,
  asset_name text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  inspection_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.star_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view star ratings" ON public.star_ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert star ratings" ON public.star_ratings FOR INSERT WITH CHECK (true);
