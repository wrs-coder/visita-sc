
-- New table for circuit-level scheduled events (not tied to a visit)
CREATE TABLE public.circuit_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  event_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  location text,
  notes text,
  companion text,
  scope text NOT NULL DEFAULT 'personal' CHECK (scope IN ('congregation','multi','all','personal')),
  congregation_ids uuid[] NOT NULL DEFAULT '{}',
  visible_to_spouse boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cse_super_date_idx ON public.circuit_schedule_events (superintendent_id, event_date);
CREATE INDEX cse_congs_idx ON public.circuit_schedule_events USING GIN (congregation_ids);

ALTER TABLE public.circuit_schedule_events ENABLE ROW LEVEL SECURITY;

-- Touch updated_at
CREATE TRIGGER cse_touch_updated_at
BEFORE UPDATE ON public.circuit_schedule_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Superintendent (owner) full management
CREATE POLICY "super manages own circuit events"
ON public.circuit_schedule_events
FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (
  superintendent_id = auth.uid()
  AND private.has_role(auth.uid(), 'superintendent'::app_role)
);

-- Members read events visible to their congregation (excluding personal and spouse-hidden)
CREATE POLICY "members read visible circuit events"
ON public.circuit_schedule_events
FOR SELECT
USING (
  visible_to_spouse = true
  AND scope <> 'personal'
  AND (
    scope = 'all'
    OR private.get_user_congregation(auth.uid()) = ANY (congregation_ids)
  )
  AND (
    scope = 'all'
      AND EXISTS (
        SELECT 1 FROM public.congregations c
        WHERE c.superintendent_id = circuit_schedule_events.superintendent_id
          AND c.id = private.get_user_congregation(auth.uid())
      )
    OR scope <> 'all'
  )
);

-- Daily auto-cleanup of past events
CREATE OR REPLACE FUNCTION public.delete_expired_circuit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.circuit_schedule_events WHERE event_date < CURRENT_DATE;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-expired-circuit-events',
  '0 6 * * *',
  $$ SELECT public.delete_expired_circuit_events(); $$
);
