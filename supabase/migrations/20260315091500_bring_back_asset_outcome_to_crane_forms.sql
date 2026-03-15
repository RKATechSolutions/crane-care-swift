-- Ensure each crane form has an Asset Outcome status question
-- and keep all Asset Outcome questions at the end of the form.

WITH crane_forms AS (
  SELECT form_id
  FROM public.form_templates
  WHERE form_name ILIKE '%crane%'
),
canonical_status_question AS (
  SELECT question_id
  FROM public.question_library
  WHERE question_id IN ('OC2-AO-001', 'JIB_OUT_01')
  ORDER BY CASE WHEN question_id = 'OC2-AO-001' THEN 0 ELSE 1 END
  LIMIT 1
),
form_max_sort AS (
  SELECT
    cf.form_id,
    COALESCE(MAX(ftq.override_sort_order), 0) AS max_sort
  FROM crane_forms cf
  LEFT JOIN public.form_template_questions ftq ON ftq.form_id = cf.form_id
  GROUP BY cf.form_id
)
INSERT INTO public.form_template_questions (
  form_id,
  question_id,
  required,
  section_override,
  override_sort_order
)
SELECT
  cf.form_id,
  csq.question_id,
  true,
  'Asset Outcome',
  fms.max_sort + 10
FROM crane_forms cf
JOIN canonical_status_question csq ON true
JOIN form_max_sort fms ON fms.form_id = cf.form_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.form_template_questions ftq_existing
  JOIN public.question_library ql_existing
    ON ql_existing.question_id = ftq_existing.question_id
  WHERE ftq_existing.form_id = cf.form_id
    AND ql_existing.question_text = 'Asset Status'
    AND ql_existing.options @> ARRAY['Crane is Operational']::text[]
)
ON CONFLICT (form_id, question_id) DO NOTHING;

WITH crane_forms AS (
  SELECT form_id
  FROM public.form_templates
  WHERE form_name ILIKE '%crane%'
),
non_outcome_max AS (
  SELECT
    cf.form_id,
    COALESCE(MAX(ftq.override_sort_order), 0) AS max_sort
  FROM crane_forms cf
  LEFT JOIN public.form_template_questions ftq ON ftq.form_id = cf.form_id
  LEFT JOIN public.question_library ql ON ql.question_id = ftq.question_id
  WHERE ql.question_id IS NULL
    OR NOT (
      ql.section = 'Asset Outcome'
      OR (
        ql.question_text = 'Asset Status'
        AND ql.options @> ARRAY['Crane is Operational']::text[]
      )
    )
  GROUP BY cf.form_id
),
outcome_rows AS (
  SELECT
    ftq.id,
    ftq.form_id,
    ROW_NUMBER() OVER (
      PARTITION BY ftq.form_id
      ORDER BY
        CASE
          WHEN ql.question_text = 'Asset Status' THEN 1
          WHEN ql.question_text = 'Defect Classification' THEN 2
          WHEN ql.question_text = 'Technician Internal Notes' THEN 3
          ELSE 99
        END,
        ql.question_text,
        ftq.question_id
    ) AS rn
  FROM public.form_template_questions ftq
  JOIN crane_forms cf ON cf.form_id = ftq.form_id
  JOIN public.question_library ql ON ql.question_id = ftq.question_id
  WHERE ql.section = 'Asset Outcome'
    OR (
      ql.question_text = 'Asset Status'
      AND ql.options @> ARRAY['Crane is Operational']::text[]
    )
)
UPDATE public.form_template_questions ftq
SET
  section_override = 'Asset Outcome',
  override_sort_order = nom.max_sort + (outcome_rows.rn * 10)
FROM outcome_rows
JOIN non_outcome_max nom ON nom.form_id = outcome_rows.form_id
WHERE ftq.id = outcome_rows.id;
