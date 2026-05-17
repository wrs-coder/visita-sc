-- Tighten private_notes RLS: superintendent must own the note AND be the superintendent of the visit's congregation
DROP POLICY IF EXISTS "owner reads private notes" ON public.private_notes;
DROP POLICY IF EXISTS "owner writes private notes" ON public.private_notes;

CREATE POLICY "super reads own congregation notes"
  ON public.private_notes FOR SELECT
  USING (
    superintendent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = private_notes.visit_id
        AND private.is_superintendent_of(auth.uid(), v.congregation_id)
    )
  );

CREATE POLICY "super writes own congregation notes"
  ON public.private_notes FOR ALL
  USING (
    superintendent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = private_notes.visit_id
        AND private.is_superintendent_of(auth.uid(), v.congregation_id)
    )
  )
  WITH CHECK (
    superintendent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = private_notes.visit_id
        AND private.is_superintendent_of(auth.uid(), v.congregation_id)
    )
  );