CREATE TABLE public.visit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  template_id text NOT NULL DEFAULT '',
  checklist_template_id text NOT NULL DEFAULT '',
  field_template_id text NOT NULL DEFAULT '',
  meeting_talk_template_id text NOT NULL DEFAULT '',
  elder_program_template_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_packages TO authenticated;
GRANT ALL ON public.visit_packages TO service_role;
ALTER TABLE public.visit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superintendent manages own packages" ON public.visit_packages
  FOR ALL TO authenticated
  USING (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'))
  WITH CHECK (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'));
CREATE INDEX visit_packages_owner_idx ON public.visit_packages (superintendent_id);
CREATE TRIGGER visit_packages_touch BEFORE UPDATE ON public.visit_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();