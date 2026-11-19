CREATE TABLE public.elder_meeting_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
  superintendent_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elder_meeting_agendas TO service_role;
ALTER TABLE public.elder_meeting_agendas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER elder_meeting_agendas_touch BEFORE UPDATE ON public.elder_meeting_agendas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();