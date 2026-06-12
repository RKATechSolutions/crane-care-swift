-- Normalised defect-trend views over the existing structured inspection data
-- (db_inspections + inspection_responses). These centralise the messy bits so
-- every consumer (baseline dashboard, customer reports) reads clean numbers:
--   * defect_flag case inconsistency  (true / True / false / False)
--   * urgency free-text variants       ("Urgent" vs "Urgent Repair Within 7 Days")
--   * non-ISO inspection_date strings
-- security_invoker = true so the views respect each caller's RLS on base tables.

CREATE OR REPLACE VIEW public.v_inspection_findings
WITH (security_invoker = true) AS
SELECT
  ir.id,
  di.id            AS inspection_id,
  di.client_id,
  di.site_name,
  di.asset_id,
  di.asset_name    AS crane,
  di.inspection_type,
  CASE WHEN di.inspection_date ~ '^\d{4}-\d{2}-\d{2}'
       THEN di.inspection_date::date ELSE NULL END AS inspection_date,
  initcap(ir.pass_fail_status) AS pass_fail,
  lower(coalesce(ir.defect_flag,'false')) IN ('true','t','1','yes') AS is_defect,
  CASE
    WHEN ir.urgency ILIKE 'immediate%' THEN 'Immediate'
    WHEN ir.urgency ILIKE 'urgent%'    THEN 'Urgent'
    WHEN ir.urgency ILIKE 'schedul%'   THEN 'Scheduled'
    WHEN ir.urgency ILIKE 'monitor%'   THEN 'Monitor'
    ELSE NULL
  END AS urgency_bucket,
  CASE
    WHEN ir.urgency ILIKE 'immediate%' THEN 4
    WHEN ir.urgency ILIKE 'urgent%'    THEN 3
    WHEN ir.urgency ILIKE 'schedul%'   THEN 2
    WHEN ir.urgency ILIKE 'monitor%'   THEN 1
    ELSE 0
  END AS urgency_rank,
  ir.question_text_snapshot,
  ir.comment,
  ir.defect_types
FROM db_inspections di
JOIN inspection_responses ir ON ir.inspection_id = di.id;

-- Per crane, per inspection rollup — the trend source for the dashboard.
CREATE OR REPLACE VIEW public.v_crane_defect_summary
WITH (security_invoker = true) AS
SELECT
  client_id, site_name, asset_id, crane, inspection_type, inspection_date,
  count(*)                                             AS items_checked,
  count(*) FILTER (WHERE pass_fail = 'Fail')           AS fails,
  count(*) FILTER (WHERE is_defect)                    AS defects,
  count(*) FILTER (WHERE urgency_bucket = 'Immediate') AS immediate,
  count(*) FILTER (WHERE urgency_bucket = 'Urgent')    AS urgent,
  count(*) FILTER (WHERE urgency_bucket = 'Scheduled') AS scheduled,
  count(*) FILTER (WHERE urgency_bucket = 'Monitor')   AS monitor,
  max(urgency_rank)                                    AS worst_urgency_rank
FROM public.v_inspection_findings
GROUP BY client_id, site_name, asset_id, crane, inspection_type, inspection_date;

GRANT SELECT ON public.v_inspection_findings  TO anon, authenticated;
GRANT SELECT ON public.v_crane_defect_summary TO anon, authenticated;
