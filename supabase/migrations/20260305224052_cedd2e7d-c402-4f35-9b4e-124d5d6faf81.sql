
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can insert admin config" ON public.admin_config;
DROP POLICY IF EXISTS "Anyone can update admin config" ON public.admin_config;
DROP POLICY IF EXISTS "Anyone can read admin config" ON public.admin_config;

CREATE POLICY "Anyone can read admin config" ON public.admin_config FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin config" ON public.admin_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin config" ON public.admin_config FOR UPDATE USING (true) WITH CHECK (true);
