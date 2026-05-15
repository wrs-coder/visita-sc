
-- 1. Congregations: is_active + limit trigger
ALTER TABLE public.congregations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.enforce_active_congregation_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    IF (
      SELECT COUNT(*) FROM public.congregations
      WHERE superintendent_id = NEW.superintendent_id
        AND is_active = true
        AND id <> NEW.id
    ) >= 9 THEN
      NEW.is_active := false;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_active_cong_limit ON public.congregations;
CREATE TRIGGER tg_active_cong_limit
BEFORE INSERT OR UPDATE OF is_active ON public.congregations
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_congregation_limit();

-- 2. Profiles: add phone (unique among non-null)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;

-- 3. Program templates
CREATE TABLE IF NOT EXISTS public.program_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  slot int NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(superintendent_id, slot)
);
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super manages templates" ON public.program_templates;
CREATE POLICY "super manages templates" ON public.program_templates FOR ALL
  USING (superintendent_id = auth.uid())
  WITH CHECK (superintendent_id = auth.uid() AND public.has_role(auth.uid(),'superintendent'));

DROP TRIGGER IF EXISTS tg_program_templates_touch ON public.program_templates;
CREATE TRIGGER tg_program_templates_touch BEFORE UPDATE ON public.program_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.program_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('study','meal','transport')),
  day_offset int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.program_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super manages template items" ON public.program_template_items;
CREATE POLICY "super manages template items" ON public.program_template_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.program_templates t WHERE t.id = template_id AND t.superintendent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.program_templates t WHERE t.id = template_id AND t.superintendent_id = auth.uid()));

-- 4. Visits: template_id
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.program_templates(id) ON DELETE SET NULL;

-- 5. Private notes: pastoreio fields
ALTER TABLE public.private_notes
  ADD COLUMN IF NOT EXISTS note_type text NOT NULL DEFAULT 'free' CHECK (note_type IN ('free','pastoral')),
  ADD COLUMN IF NOT EXISTS companion text,
  ADD COLUMN IF NOT EXISTS involved_names text,
  ADD COLUMN IF NOT EXISTS additional_info text,
  ADD COLUMN IF NOT EXISTS note_date date;

-- 6. apply_template_to_visit
CREATE OR REPLACE FUNCTION public.apply_template_to_visit(_visit_id uuid, _template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date;
  v_super uuid;
  v_cong uuid;
  it record;
  target_date date;
BEGIN
  SELECT start_date, congregation_id INTO v_start, v_cong FROM public.visits WHERE id = _visit_id;
  IF v_start IS NULL THEN RAISE EXCEPTION 'Visit not found'; END IF;
  SELECT superintendent_id INTO v_super FROM public.congregations WHERE id = v_cong;
  IF v_super IS NULL OR v_super <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.program_templates WHERE id = _template_id AND superintendent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  UPDATE public.visits SET template_id = _template_id WHERE id = _visit_id;

  FOR it IN SELECT * FROM public.program_template_items WHERE template_id = _template_id ORDER BY sort_order LOOP
    target_date := v_start + (it.day_offset || ' days')::interval;
    IF it.kind = 'study' THEN
      INSERT INTO public.field_assignments(visit_id, event_date, period, meeting_point, meeting_time, acompanhante, contact_phone, is_active)
      VALUES (_visit_id, target_date,
        COALESCE(it.payload->>'period','Manhã'),
        it.payload->>'meeting_point',
        NULLIF(it.payload->>'meeting_time','')::time,
        it.payload->>'acompanhante',
        it.payload->>'contact_phone',
        COALESCE((it.payload->>'is_active')::bool, true));
    ELSIF it.kind = 'meal' THEN
      INSERT INTO public.meals(visit_id, meal_date, type, host_name, location, meal_time, notes, is_active)
      VALUES (_visit_id, target_date,
        COALESCE(it.payload->>'type','lunch')::meal_type,
        COALESCE(it.payload->>'host_name','—'),
        it.payload->>'location',
        NULLIF(it.payload->>'meal_time','')::time,
        it.payload->>'notes',
        COALESCE((it.payload->>'is_active')::bool, true));
    ELSIF it.kind = 'transport' THEN
      INSERT INTO public.transport_schedule(visit_id, driver_name, contact_phone, event_date, description, notes, is_active)
      VALUES (_visit_id,
        COALESCE(it.payload->>'driver_name','—'),
        it.payload->>'contact_phone',
        target_date,
        it.payload->>'description',
        it.payload->>'notes',
        COALESCE((it.payload->>'is_active')::bool, true));
    END IF;
  END LOOP;
END $$;
