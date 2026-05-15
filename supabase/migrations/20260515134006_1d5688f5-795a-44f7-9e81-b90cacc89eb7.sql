-- Allow superintendents to create congregations they own
CREATE POLICY "super inserts congregation"
ON public.congregations
FOR INSERT
TO authenticated
WITH CHECK (superintendent_id = auth.uid() AND public.has_role(auth.uid(), 'superintendent'));

-- Make sure a super can read all of their own congregations (not just the active one)
DROP POLICY IF EXISTS "members see congregation" ON public.congregations;
CREATE POLICY "members see congregation"
ON public.congregations
FOR SELECT
TO authenticated
USING (
  id = public.get_user_congregation(auth.uid())
  OR superintendent_id = auth.uid()
);