-- Self-reported "do you approve recommended repairs promptly?" — kept alongside
-- the AroFlo-measured adoption rate so the baseline can surface the gap between
-- how responsive a customer believes they are vs what their records show.
ALTER TABLE public.crane_baselines
  ADD COLUMN IF NOT EXISTS acts_on_recommendations text;
