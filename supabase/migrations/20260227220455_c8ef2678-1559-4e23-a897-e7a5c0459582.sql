
-- Create leave request types
CREATE TYPE public.leave_type AS ENUM ('annual_leave', 'time_in_lieu', 'sick_leave', 'personal');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  status public.leave_status NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  xero_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies (app doesn't use auth.uid() currently, so open for now)
CREATE POLICY "Anyone can view leave requests" ON public.leave_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leave requests" ON public.leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leave requests" ON public.leave_requests FOR UPDATE USING (true);
