-- Adds accountability, production-criticality and responsiveness fields to the
-- Crane Culture & Performance Baseline. These capture data the customer's own
-- behaviour drives, so the dashboard can separate service quality from how
-- quickly recommended work is actioned.

ALTER TABLE public.crane_baselines
  -- Breakdown accountability
  ADD COLUMN IF NOT EXISTS preventable_breakdowns integer,

  -- Production & Risk
  ADD COLUMN IF NOT EXISTS lifts_per_shift numeric,
  ADD COLUMN IF NOT EXISTS crane_single_point_failure text,          -- Yes / Partially / No
  ADD COLUMN IF NOT EXISTS idle_headcount_during_downtime integer,
  ADD COLUMN IF NOT EXISTS overtime_hours_downtime numeric,
  ADD COLUMN IF NOT EXISTS penalty_per_missed_dispatch numeric,
  ADD COLUMN IF NOT EXISTS critical_spares_onsite text,              -- Yes / Partially / No
  ADD COLUMN IF NOT EXISTS critical_part_lead_time numeric,

  -- Responsiveness / decision-making
  ADD COLUMN IF NOT EXISTS quote_approval_lag numeric,               -- days
  ADD COLUMN IF NOT EXISTS repairs_approved_per_10 numeric,          -- 0-10
  ADD COLUMN IF NOT EXISTS declined_work_value numeric,
  ADD COLUMN IF NOT EXISTS approval_threshold text,
  ADD COLUMN IF NOT EXISTS capital_budget_month text,
  ADD COLUMN IF NOT EXISTS decision_maker_reachable text;            -- Yes / Partially / No
