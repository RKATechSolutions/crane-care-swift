
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- clients table
DROP POLICY IF EXISTS "Anyone can view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow update clients" ON public.clients;

CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update clients" ON public.clients FOR UPDATE USING (true);

-- assets table
DROP POLICY IF EXISTS "Anyone can view assets" ON public.assets;
DROP POLICY IF EXISTS "Allow insert assets" ON public.assets;
DROP POLICY IF EXISTS "Allow update assets" ON public.assets;

CREATE POLICY "Anyone can view assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Allow insert assets" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update assets" ON public.assets FOR UPDATE USING (true);

-- client_contacts table
DROP POLICY IF EXISTS "Anyone can view client contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Allow insert client contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Allow update client contacts" ON public.client_contacts;

CREATE POLICY "Anyone can view client contacts" ON public.client_contacts FOR SELECT USING (true);
CREATE POLICY "Allow insert client contacts" ON public.client_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update client contacts" ON public.client_contacts FOR UPDATE USING (true);
