CREATE OR REPLACE VIEW public.lifting_register_lite AS
SELECT
  id, equipment_type, manufacturer, model, serial_number, asset_tag,
  wll_value, wll_unit, length_m, grade, tag_present, equipment_status,
  site_name, notes, registered_by_name, created_at, sling_configuration,
  sling_leg_count, lift_height_m, span_m, client_id, confirmed_by_name,
  registered_by_id, confirmed_by_id, updated_at, wll_unit as wll_unit_dup
FROM public.lifting_register;

-- Grant access
GRANT SELECT ON public.lifting_register_lite TO anon, authenticated;