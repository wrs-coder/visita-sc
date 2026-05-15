
CREATE POLICY "super manages templates" ON public.program_templates FOR ALL
  USING (superintendent_id = auth.uid())
  WITH CHECK ((superintendent_id = auth.uid()) AND private.has_role(auth.uid(), 'superintendent'::public.app_role));
