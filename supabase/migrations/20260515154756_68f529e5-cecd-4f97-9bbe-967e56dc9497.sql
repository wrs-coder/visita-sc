
-- 1) field_assignments: remove dirigente/piloto, add contact_phone
ALTER TABLE public.field_assignments DROP COLUMN IF EXISTS dirigente;
ALTER TABLE public.field_assignments DROP COLUMN IF EXISTS piloto;
ALTER TABLE public.field_assignments ADD COLUMN IF NOT EXISTS contact_phone text;

-- 2) Hide inactive items for non-editors via RLS
DROP POLICY IF EXISTS "members read field" ON public.field_assignments;
CREATE POLICY "members read field" ON public.field_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = field_assignments.visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
  AND (is_active OR public.can_edit_visit(auth.uid(), visit_id))
);

DROP POLICY IF EXISTS "members read schedule" ON public.schedule_events;
CREATE POLICY "members read schedule" ON public.schedule_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = schedule_events.visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
  AND (is_active OR EXISTS (SELECT 1 FROM public.visits v2 WHERE v2.id = schedule_events.visit_id AND public.is_superintendent_of(auth.uid(), v2.congregation_id)))
);

DROP POLICY IF EXISTS "members read meals" ON public.meals;
CREATE POLICY "members read meals" ON public.meals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = meals.visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
  AND (is_active OR EXISTS (SELECT 1 FROM public.visits v2 WHERE v2.id = meals.visit_id AND public.is_superintendent_of(auth.uid(), v2.congregation_id)))
);

-- 3) transport_schedule
CREATE TABLE IF NOT EXISTS public.transport_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  driver_name text NOT NULL,
  contact_phone text,
  event_date date,
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read transport" ON public.transport_schedule FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = transport_schedule.visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
  AND (is_active OR public.can_edit_visit(auth.uid(), visit_id))
);

CREATE POLICY "editors insert transport" ON public.transport_schedule FOR INSERT WITH CHECK (
  public.can_edit_visit(auth.uid(), visit_id)
);

CREATE POLICY "editors update transport" ON public.transport_schedule FOR UPDATE USING (
  public.can_edit_visit(auth.uid(), visit_id)
);

CREATE POLICY "super deletes transport" ON public.transport_schedule FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = transport_schedule.visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);

CREATE TRIGGER touch_transport_updated_at BEFORE UPDATE ON public.transport_schedule
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_schedule;
