DROP POLICY IF EXISTS "members read circuit events for their congregation" ON public.circuit_schedule_events;

CREATE POLICY "members read circuit events for their congregation"
ON public.circuit_schedule_events FOR SELECT
USING (
  scope <> 'personal'
  AND scope <> 'wife'
  AND (
    (scope = 'all' AND EXISTS (
      SELECT 1 FROM public.congregations c
      WHERE c.superintendent_id = circuit_schedule_events.superintendent_id
        AND c.id = private.get_user_congregation(auth.uid())
    ))
    OR (scope NOT IN ('all','wife') AND private.get_user_congregation(auth.uid()) = ANY (congregation_ids))
  )
);