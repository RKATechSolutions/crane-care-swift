
-- Create time entry types
CREATE TYPE public.time_entry_type AS ENUM ('inspection', 'travel', 'repair', 'admin', 'training', 'other');
CREATE TYPE public.timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Individual time entries logged by technicians
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  entry_date DATE NOT NULL,
  entry_type public.time_entry_type NOT NULL,
  start_time TEXT,
  end_time TEXT,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  client_name TEXT,
  site_id TEXT,
  inspection_id TEXT,
  is_auto_logged BOOLEAN NOT NULL DEFAULT false,
  xero_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly timesheet summary for admin review
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  status public.timesheet_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  xero_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (technician_id, week_start)
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Policies (matching existing app pattern — no auth yet)
CREATE POLICY "Anyone can view time entries" ON public.time_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert time entries" ON public.time_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update time entries" ON public.time_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete time entries" ON public.time_entries FOR DELETE USING (true);

CREATE POLICY "Anyone can view timesheets" ON public.timesheets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert timesheets" ON public.timesheets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update timesheets" ON public.timesheets FOR UPDATE USING (true);
