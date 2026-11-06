DO $$
DECLARE
  src uuid := '7a62a72e-8932-40b0-9bfb-f6a59ce8d7e6';
  dst uuid := '64411a1b-68f4-4cc6-9802-601a0d005844';
  t text; cols text; sel text;
BEGIN
  FOREACH t IN ARRAY ARRAY['checklist_items','elder_encouragements','elder_local_matters','elder_pastoral_visits','elder_program_visit_sections','elder_program_visit_slots','elder_recommendations','elders_servants_meetings','field_assignments','field_meetings','meal_day_notes','meals','midweek_meetings','pioneer_meetings','schedule_events','transport_schedule','visit_template_overrides','weekend_meetings'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE visit_id = $1', t) USING dst;
    SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position),
           string_agg(CASE
             WHEN column_name = 'visit_id' THEN quote_literal(dst) || '::uuid'
             WHEN column_name = 'id' THEN 'gen_random_uuid()'
             WHEN column_name IN ('created_at','updated_at') THEN 'now()'
             WHEN data_type = 'date' THEN quote_ident(column_name) || ' - 105'
             WHEN data_type = 'timestamp with time zone' THEN quote_ident(column_name) || ' - interval ''105 days'''
             ELSE quote_ident(column_name) END, ',' ORDER BY ordinal_position)
      INTO cols, sel
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t AND is_generated = 'NEVER';
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM public.%I WHERE visit_id = $1', t, cols, sel, t) USING src;
  END LOOP;
  UPDATE public.visits d SET
    template_id = s.template_id, checklist_template_id = s.checklist_template_id,
    field_meeting_template_id = s.field_meeting_template_id, meeting_talk_template_id = s.meeting_talk_template_id,
    elder_program_template_id = s.elder_program_template_id, template_snapshot = s.template_snapshot,
    substitute_name = s.substitute_name, substitute_phone = s.substitute_phone, substitute_email = s.substitute_email,
    last_applied_at = now(), updated_at = now()
  FROM public.visits s WHERE s.id = src AND d.id = dst;
END $$;