CREATE TABLE public.elder_agenda_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_agenda_templates TO authenticated;
GRANT ALL ON public.elder_agenda_templates TO service_role;
ALTER TABLE public.elder_agenda_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages agenda templates" ON public.elder_agenda_templates
  FOR ALL TO authenticated
  USING (superintendent_id = auth.uid())
  WITH CHECK (superintendent_id = auth.uid());
CREATE INDEX elder_agenda_templates_owner_idx ON public.elder_agenda_templates(superintendent_id);
CREATE TRIGGER elder_agenda_templates_touch BEFORE UPDATE ON public.elder_agenda_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();