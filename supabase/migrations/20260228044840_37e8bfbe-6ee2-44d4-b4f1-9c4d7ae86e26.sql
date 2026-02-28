
-- Create receipts table
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  merchant_name TEXT,
  amount NUMERIC,
  receipt_date DATE,
  category TEXT DEFAULT 'general',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  xero_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view receipts" ON public.receipts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert receipts" ON public.receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update receipts" ON public.receipts FOR UPDATE USING (true);

-- Storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Anyone can view receipt files" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
