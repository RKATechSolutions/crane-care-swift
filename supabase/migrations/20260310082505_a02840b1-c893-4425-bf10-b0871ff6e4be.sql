UPDATE public.question_library
SET question_text = 'Asset Status',
    options = ARRAY['Safe to Operate', 'Operate with Limitations', 'Unsafe to Operate'],
    updated_at = now()
WHERE question_id IN ('OC2-AO-001', 'JIB_OUT_01');