
-- Add sell_price to job_costs for margin tracking on materials
ALTER TABLE public.job_costs ADD COLUMN sell_price numeric NULL;
