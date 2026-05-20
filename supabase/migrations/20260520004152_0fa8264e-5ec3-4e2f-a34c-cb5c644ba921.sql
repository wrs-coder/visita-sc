-- Atualiza políticas de SELECT das tabelas filhas de visits para incluir o
-- Superintendente da congregação, além dos membros (profile.congregation_id).

DROP POLICY IF EXISTS "members read midweek" ON public.midweek_meetings;
CREATE POLICY "members read midweek" ON public.midweek_meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = midweek_meetings.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);

DROP POLICY IF EXISTS "members read weekend" ON public.weekend_meetings;
CREATE POLICY "members read weekend" ON public.weekend_meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = weekend_meetings.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);

DROP POLICY IF EXISTS "members read pioneer" ON public.pioneer_meetings;
CREATE POLICY "members read pioneer" ON public.pioneer_meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = pioneer_meetings.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);

DROP POLICY IF EXISTS "members read elders meet" ON public.elders_servants_meetings;
CREATE POLICY "members read elders meet" ON public.elders_servants_meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = elders_servants_meetings.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);

DROP POLICY IF EXISTS "members read field meetings" ON public.field_meetings;
CREATE POLICY "members read field meetings" ON public.field_meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = field_meetings.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
  AND (is_active OR private.can_edit_visit(auth.uid(), visit_id))
);

DROP POLICY IF EXISTS "members read field" ON public.field_assignments;
CREATE POLICY "members read field" ON public.field_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = field_assignments.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
  AND (is_active OR private.can_edit_visit(auth.uid(), visit_id))
);

DROP POLICY IF EXISTS "members read meals" ON public.meals;
CREATE POLICY "members read meals" ON public.meals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = meals.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
  AND (
    is_active
    OR EXISTS (
      SELECT 1 FROM public.visits v2
      WHERE v2.id = meals.visit_id
        AND private.is_superintendent_of(auth.uid(), v2.congregation_id)
    )
  )
);

DROP POLICY IF EXISTS "members read transport" ON public.transport_schedule;
CREATE POLICY "members read transport" ON public.transport_schedule
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = transport_schedule.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
  AND (is_active OR private.can_edit_visit(auth.uid(), visit_id))
);

DROP POLICY IF EXISTS "members read schedule" ON public.schedule_events;
CREATE POLICY "members read schedule" ON public.schedule_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = schedule_events.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
  AND (
    is_active
    OR EXISTS (
      SELECT 1 FROM public.visits v2
      WHERE v2.id = schedule_events.visit_id
        AND private.is_superintendent_of(auth.uid(), v2.congregation_id)
    )
  )
);

DROP POLICY IF EXISTS "members read checklist" ON public.checklist_items;
CREATE POLICY "members read checklist" ON public.checklist_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = checklist_items.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);

DROP POLICY IF EXISTS "members read meal day notes" ON public.meal_day_notes;
CREATE POLICY "members read meal day notes" ON public.meal_day_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = meal_day_notes.visit_id
      AND (
        v.congregation_id = private.get_user_congregation(auth.uid())
        OR private.is_superintendent_of(auth.uid(), v.congregation_id)
      )
  )
);