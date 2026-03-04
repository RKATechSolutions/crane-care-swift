
CREATE TABLE public.admin_config (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin config"
  ON public.admin_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update admin config"
  ON public.admin_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert admin config"
  ON public.admin_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO public.admin_config (id, config) VALUES ('default', '{}'::jsonb);
