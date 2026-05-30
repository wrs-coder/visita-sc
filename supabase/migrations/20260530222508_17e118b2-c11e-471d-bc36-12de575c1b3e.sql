ALTER TABLE public.circuit_schedule_events DROP CONSTRAINT IF EXISTS circuit_schedule_events_scope_check;
ALTER TABLE public.circuit_schedule_events ADD CONSTRAINT circuit_schedule_events_scope_check
  CHECK (scope = ANY (ARRAY['congregation'::text, 'multi'::text, 'all'::text, 'personal'::text, 'wife'::text]));