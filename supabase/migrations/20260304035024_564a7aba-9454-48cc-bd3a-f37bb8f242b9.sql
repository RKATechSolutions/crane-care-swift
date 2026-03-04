ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS client_custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;