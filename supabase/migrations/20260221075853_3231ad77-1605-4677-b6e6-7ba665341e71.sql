
-- Clients table (deduplicated)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  location_address TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_mobile TEXT,
  primary_contact_given_name TEXT,
  primary_contact_surname TEXT,
  primary_contact_position TEXT,
  send_schedule_reminders TEXT,
  site_induction_details TEXT,
  created_date TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_name)
);

-- Client contacts table (additional contacts)
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_email TEXT,
  contact_given_name TEXT,
  contact_mobile TEXT,
  contact_phone TEXT,
  contact_position TEXT,
  contact_surname TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Public read access (all authenticated users can view clients)
CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Anyone can view client contacts" ON public.client_contacts FOR SELECT USING (true);

-- Allow inserts/updates for now (will lock down later with auth)
CREATE POLICY "Allow insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow insert client contacts" ON public.client_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update client contacts" ON public.client_contacts FOR UPDATE USING (true);

-- Indexes
CREATE INDEX idx_clients_name ON public.clients(client_name);
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
