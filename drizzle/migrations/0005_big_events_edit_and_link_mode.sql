ALTER TABLE public.circuit_big_events ADD COLUMN IF NOT EXISTS start_time text, ADD COLUMN IF NOT EXISTS link_mode text NOT NULL DEFAULT 'pin';
ALTER TABLE public.circuit_big_events ADD CONSTRAINT circuit_big_events_link_mode_chk CHECK (link_mode IN ('pin','personal'));
ALTER TABLE public.circuit_big_event_parts ADD COLUMN IF NOT EXISTS speaker_congregation text, ADD COLUMN IF NOT EXISTS time_mode text NOT NULL DEFAULT 'auto', ADD COLUMN IF NOT EXISTS personal_token uuid;
ALTER TABLE public.circuit_big_event_parts ADD CONSTRAINT circuit_big_event_parts_time_mode_chk CHECK (time_mode IN ('auto','manual'));
CREATE UNIQUE INDEX IF NOT EXISTS circuit_big_event_parts_personal_token_key ON public.circuit_big_event_parts(personal_token) WHERE personal_token IS NOT NULL;