
-- Create a public bucket for data imports
INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', true);

CREATE POLICY "Public read imports" ON storage.objects FOR SELECT USING (bucket_id = 'imports');
CREATE POLICY "Allow insert imports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'imports');
