CREATE TABLE public.letter_templates (
  superintendent_id uuid NOT NULL DEFAULT auth.uid(),
  id text NOT NULL,
  name text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (superintendent_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_templates TO authenticated;
GRANT ALL ON public.letter_templates TO service_role;
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own letter templates" ON public.letter_templates
  FOR ALL TO authenticated
  USING (auth.uid() = superintendent_id)
  WITH CHECK (auth.uid() = superintendent_id);