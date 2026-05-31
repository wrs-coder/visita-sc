CREATE TABLE public.couple_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  superintendent_id uuid NOT NULL,
  parent_id uuid REFERENCES public.couple_messages(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('super','wife')),
  title text,
  body text NOT NULL,
  read_by_super boolean NOT NULL DEFAULT false,
  read_by_wife boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_couple_messages_super ON public.couple_messages(superintendent_id, parent_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_messages TO authenticated;
GRANT ALL ON public.couple_messages TO service_role;

ALTER TABLE public.couple_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages own couple messages"
ON public.couple_messages
FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (superintendent_id = auth.uid());

CREATE TRIGGER trg_couple_messages_updated_at
BEFORE UPDATE ON public.couple_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();