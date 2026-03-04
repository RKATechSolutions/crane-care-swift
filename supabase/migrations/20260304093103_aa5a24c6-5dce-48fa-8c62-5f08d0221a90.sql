
-- Allow deleting db_inspections
CREATE POLICY "Anyone can delete db inspections"
ON public.db_inspections
FOR DELETE
USING (true);

-- Allow deleting inspection_responses
CREATE POLICY "Anyone can delete inspection responses"
ON public.inspection_responses
FOR DELETE
USING (true);
