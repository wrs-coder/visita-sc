CREATE OR REPLACE FUNCTION private.seed_default_checklist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tpl uuid;
BEGIN
  SELECT id INTO v_tpl FROM public.checklist_templates WHERE congregation_id = NEW.congregation_id LIMIT 1;
  IF v_tpl IS NOT NULL THEN
    INSERT INTO public.checklist_items (visit_id, title, description, sort_order, status)
    SELECT NEW.id, ti.title, ti.description, ti.sort_order, 'pending'
    FROM public.checklist_template_items ti
    WHERE ti.template_id = v_tpl
    ORDER BY ti.sort_order;
  END IF;
  RETURN NEW;
END $$;