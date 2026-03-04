
CREATE POLICY "Anyone can delete lifting register"
ON public.lifting_register
FOR DELETE
USING (true);
