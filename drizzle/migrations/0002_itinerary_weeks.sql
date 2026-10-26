CREATE TABLE public.itinerary_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL DEFAULT auth.uid(),
  week_type text NOT NULL CHECK (week_type IN ('pioneer','free')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_weeks TO authenticated;
GRANT ALL ON public.itinerary_weeks TO service_role;
ALTER TABLE public.itinerary_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super manages own itinerary weeks" ON public.itinerary_weeks
  FOR ALL TO authenticated
  USING (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'))
  WITH CHECK (superintendent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'superintendent'));
CREATE INDEX itinerary_weeks_super_start_idx ON public.itinerary_weeks (superintendent_id, start_date);
CREATE TRIGGER itinerary_weeks_touch BEFORE UPDATE ON public.itinerary_weeks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();