
-- 1) New column on field_assignments to indicate who the companion is for
ALTER TABLE public.field_assignments
  ADD COLUMN IF NOT EXISTS acompanhante_for text;

-- 2) Update apply_template_to_visit to include acompanhante_for from payload
CREATE OR REPLACE FUNCTION public.apply_template_to_visit(_visit_id uuid, _template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.field_assignments(visit_id, event_date, period, meeting_point, meeting_time, acompanhante, acompanhante_for, contact_phone, is_active)
      VALUES (_visit_id, target_date,
        COALESCE(it.payload->>'period','Manhã'),
        it.payload->>'meeting_point',
        NULLIF(it.payload->>'meeting_time','')::time,
        it.payload->>'acompanhante',
        it.payload->>'acompanhante_for',
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
END $function$;

-- 3) Reset: wipe all app data and user accounts
TRUNCATE TABLE
  public.checklist_items,
  public.field_assignments,
  public.meals,
  public.schedule_events,
  public.transport_schedule,
  public.private_notes,
  public.program_template_items,
  public.program_templates,
  public.visits,
  public.user_roles,
  public.congregations,
  public.profiles
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;
