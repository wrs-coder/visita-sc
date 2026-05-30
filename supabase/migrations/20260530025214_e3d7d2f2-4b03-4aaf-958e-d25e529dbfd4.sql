
CREATE POLICY "super reads own personal notes"
ON public.private_notes
FOR SELECT
USING (superintendent_id = auth.uid());

CREATE POLICY "super writes own personal notes"
ON public.private_notes
FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (superintendent_id = auth.uid());
