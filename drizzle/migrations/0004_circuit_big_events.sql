CREATE TABLE public.circuit_big_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'assembly',
  event_date date,
  location text,
  extra_info text,
  notes text,
  public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circuit_big_events TO authenticated;
GRANT ALL ON public.circuit_big_events TO service_role;
ALTER TABLE public.circuit_big_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages big events" ON public.circuit_big_events FOR ALL TO authenticated
  USING (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'))
  WITH CHECK (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'));
CREATE TRIGGER circuit_big_events_touch BEFORE UPDATE ON public.circuit_big_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.circuit_big_event_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.circuit_big_events(id) ON DELETE CASCADE,
  superintendent_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  part_time text,
  duration_min integer,
  theme text NOT NULL DEFAULT '',
  outline_number text,
  instructions text,
  part_type_id text,
  part_type_label text,
  symposium boolean NOT NULL DEFAULT false,
  talk_includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_to text NOT NULL DEFAULT 'speaker',
  speaker_name text,
  show_next_speaker boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  decline_reason text,
  pin_hash text,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX circuit_big_event_parts_pin_uq ON public.circuit_big_event_parts(event_id, pin_hash) WHERE pin_hash IS NOT NULL;
CREATE INDEX circuit_big_event_parts_event_idx ON public.circuit_big_event_parts(event_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circuit_big_event_parts TO authenticated;
GRANT ALL ON public.circuit_big_event_parts TO service_role;
ALTER TABLE public.circuit_big_event_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages big event parts" ON public.circuit_big_event_parts FOR ALL TO authenticated
  USING (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.circuit_big_events e WHERE e.id = event_id AND e.superintendent_id = auth.uid()))
  WITH CHECK (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.circuit_big_events e WHERE e.id = event_id AND e.superintendent_id = auth.uid()));
CREATE TRIGGER circuit_big_event_parts_touch BEFORE UPDATE ON public.circuit_big_event_parts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.circuit_big_event_parts;