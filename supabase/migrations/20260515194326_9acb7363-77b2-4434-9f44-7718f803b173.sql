
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_superintendent_of(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_congregation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_edit_visit(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_congregations() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.seed_default_checklist() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_active_congregation_limit() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_checklist_template_limit() CASCADE;
DROP FUNCTION IF EXISTS public.apply_template_to_visit(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_superintendent_of(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.congregations WHERE id = _congregation_id AND superintendent_id = _user_id) $$;

CREATE OR REPLACE FUNCTION private.get_user_congregation(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT congregation_id FROM public.profiles WHERE id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION private.can_edit_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = _visit_id
      AND (
        private.is_superintendent_of(_user_id, v.congregation_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.congregation_id = v.congregation_id
            AND ur.role = 'elder'
            AND ur.elder_position IN ('coordenador','secretario','sup_servico')
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END $$;

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
    RETURN NEW;
  END IF;
  INSERT INTO public.checklist_items (visit_id, title, description, sort_order, status) VALUES
    (NEW.id, 'Quantos Publicadores Ativos?', NULL, 10, 'pending'),
    (NEW.id, 'Quantos inativos a vários anos?', NULL, 20, 'pending'),
    (NEW.id, 'Quantos pioneiros auxiliares para este mês da visita?', NULL, 30, 'pending'),
    (NEW.id, 'Quais são as maiores dificuldades que os membros da congregação tem enfrentado nos últimos 3 meses?', NULL, 40, 'pending'),
    (NEW.id, 'Quantos: Novos Publicadores', NULL, 50, 'pending'),
    (NEW.id, 'Quantos: Novos Batizados', NULL, 60, 'pending'),
    (NEW.id, 'Quantos: Chegaram', NULL, 70, 'pending'),
    (NEW.id, 'Quantos: Partiram', NULL, 80, 'pending'),
    (NEW.id, 'Quantos: Inativos', NULL, 90, 'pending'),
    (NEW.id, 'Quantos: Reativados', NULL, 100, 'pending'),
    (NEW.id, 'Quantos: Deixou de ser Publicador', NULL, 110, 'pending'),
    (NEW.id, 'Quantos: Removidos', NULL, 120, 'pending'),
    (NEW.id, 'Quantos: Readmitidos', NULL, 130, 'pending');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.enforce_active_congregation_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    IF (SELECT COUNT(*) FROM public.congregations WHERE superintendent_id = NEW.superintendent_id AND is_active = true AND id <> NEW.id) >= 9 THEN
      NEW.is_active := false;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.enforce_checklist_template_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.checklist_templates WHERE superintendent_id = NEW.superintendent_id) >= 24 THEN
    RAISE EXCEPTION 'Limite de 24 modelos de checklist atingido.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.apply_template_to_visit(_visit_id uuid, _template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start date; v_cong uuid; it record; target_date date;
BEGIN
  SELECT start_date, congregation_id INTO v_start, v_cong FROM public.visits WHERE id = _visit_id;
  IF v_start IS NULL THEN RAISE EXCEPTION 'Visit not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.program_templates WHERE id = _template_id) THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  UPDATE public.visits SET template_id = _template_id WHERE id = _visit_id;
  FOR it IN SELECT * FROM public.program_template_items WHERE template_id = _template_id ORDER BY sort_order LOOP
    target_date := v_start + (it.day_offset || ' days')::interval;
    IF it.kind = 'study' THEN
      INSERT INTO public.field_assignments(visit_id, event_date, period, meeting_point, meeting_time, acompanhante, acompanhante_for, contact_phone, is_active)
      VALUES (_visit_id, target_date, COALESCE(it.payload->>'period','Manhã'), it.payload->>'meeting_point', NULLIF(it.payload->>'meeting_time','')::time, it.payload->>'acompanhante', it.payload->>'acompanhante_for', it.payload->>'contact_phone', COALESCE((it.payload->>'is_active')::bool, true));
    ELSIF it.kind = 'meal' THEN
      INSERT INTO public.meals(visit_id, meal_date, type, host_name, location, meal_time, notes, is_active)
      VALUES (_visit_id, target_date, COALESCE(it.payload->>'type','lunch')::meal_type, COALESCE(it.payload->>'host_name','—'), it.payload->>'location', NULLIF(it.payload->>'meal_time','')::time, it.payload->>'notes', COALESCE((it.payload->>'is_active')::bool, true));
    ELSIF it.kind = 'transport' THEN
      INSERT INTO public.transport_schedule(visit_id, driver_name, contact_phone, event_date, description, notes, is_active)
      VALUES (_visit_id, COALESCE(it.payload->>'driver_name','—'), it.payload->>'contact_phone', target_date, it.payload->>'description', it.payload->>'notes', COALESCE((it.payload->>'is_active')::bool, true));
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_superintendent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_congregation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_visit(uuid, uuid) TO authenticated;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS seed_default_checklist_trigger ON public.visits;
DROP TRIGGER IF EXISTS trg_seed_default_checklist ON public.visits;
DROP TRIGGER IF EXISTS tg_active_cong_limit ON public.congregations;
DROP TRIGGER IF EXISTS checklist_template_limit ON public.checklist_templates;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
CREATE TRIGGER seed_default_checklist_trigger AFTER INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION private.seed_default_checklist();
CREATE TRIGGER tg_active_cong_limit BEFORE INSERT OR UPDATE OF is_active ON public.congregations FOR EACH ROW EXECUTE FUNCTION private.enforce_active_congregation_limit();
CREATE TRIGGER checklist_template_limit BEFORE INSERT ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION private.enforce_checklist_template_limit();

-- Drop & recreate ALL relevant policies (idempotent)
DROP POLICY IF EXISTS "members see congregation" ON public.congregations;
DROP POLICY IF EXISTS "super inserts congregation" ON public.congregations;
DROP POLICY IF EXISTS "super updates congregation" ON public.congregations;
DROP POLICY IF EXISTS "super deletes congregation" ON public.congregations;
DROP POLICY IF EXISTS "members see visits" ON public.visits;
DROP POLICY IF EXISTS "super manages visits" ON public.visits;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "supers read congregation roles" ON public.user_roles;
DROP POLICY IF EXISTS "members read checklist" ON public.checklist_items;
DROP POLICY IF EXISTS "super inserts checklist" ON public.checklist_items;
DROP POLICY IF EXISTS "super deletes checklist" ON public.checklist_items;
DROP POLICY IF EXISTS "editors update checklist" ON public.checklist_items;
DROP POLICY IF EXISTS "super manages checklist templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "members read linked checklist template" ON public.checklist_templates;
DROP POLICY IF EXISTS "super manages checklist template items" ON public.checklist_template_items;
DROP POLICY IF EXISTS "members read linked checklist template items" ON public.checklist_template_items;
DROP POLICY IF EXISTS "members read field" ON public.field_assignments;
DROP POLICY IF EXISTS "editors write field" ON public.field_assignments;
DROP POLICY IF EXISTS "editors update field" ON public.field_assignments;
DROP POLICY IF EXISTS "super deletes field" ON public.field_assignments;
DROP POLICY IF EXISTS "members read meals" ON public.meals;
DROP POLICY IF EXISTS "editors insert meals" ON public.meals;
DROP POLICY IF EXISTS "editors update meals" ON public.meals;
DROP POLICY IF EXISTS "super deletes meals" ON public.meals;
DROP POLICY IF EXISTS "members read schedule" ON public.schedule_events;
DROP POLICY IF EXISTS "super manages schedule" ON public.schedule_events;
DROP POLICY IF EXISTS "members read transport" ON public.transport_schedule;
DROP POLICY IF EXISTS "editors insert transport" ON public.transport_schedule;
DROP POLICY IF EXISTS "editors update transport" ON public.transport_schedule;
DROP POLICY IF EXISTS "super deletes transport" ON public.transport_schedule;

-- congregations
CREATE POLICY "members see congregation" ON public.congregations FOR SELECT TO authenticated
  USING ((id = private.get_user_congregation(auth.uid())) OR (superintendent_id = auth.uid()));
CREATE POLICY "super inserts congregation" ON public.congregations FOR INSERT TO authenticated
  WITH CHECK ((superintendent_id = auth.uid()) AND private.has_role(auth.uid(), 'superintendent'::public.app_role));
CREATE POLICY "super updates congregation" ON public.congregations FOR UPDATE
  USING (superintendent_id = auth.uid());
CREATE POLICY "super deletes congregation" ON public.congregations FOR DELETE
  USING (superintendent_id = auth.uid());

-- visits
CREATE POLICY "members see visits" ON public.visits FOR SELECT
  USING (congregation_id = private.get_user_congregation(auth.uid()));
CREATE POLICY "super manages visits" ON public.visits FOR ALL
  USING (private.is_superintendent_of(auth.uid(), congregation_id))
  WITH CHECK (private.is_superintendent_of(auth.uid(), congregation_id));

-- user_roles
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "supers read congregation roles" ON public.user_roles FOR SELECT
  USING ((congregation_id IS NOT NULL) AND private.is_superintendent_of(auth.uid(), congregation_id));

-- checklist_items
CREATE POLICY "members read checklist" ON public.checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = checklist_items.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid())));
CREATE POLICY "super inserts checklist" ON public.checklist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = checklist_items.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));
CREATE POLICY "super deletes checklist" ON public.checklist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = checklist_items.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));
CREATE POLICY "editors update checklist" ON public.checklist_items FOR UPDATE
  USING (private.can_edit_visit(auth.uid(), visit_id));

-- checklist_templates
CREATE POLICY "super manages checklist templates" ON public.checklist_templates FOR ALL
  USING (superintendent_id = auth.uid())
  WITH CHECK ((superintendent_id = auth.uid()) AND private.has_role(auth.uid(), 'superintendent'::public.app_role));
CREATE POLICY "members read linked checklist template" ON public.checklist_templates FOR SELECT
  USING ((congregation_id IS NOT NULL) AND (congregation_id = private.get_user_congregation(auth.uid())));

-- checklist_template_items
CREATE POLICY "super manages checklist template items" ON public.checklist_template_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = checklist_template_items.template_id AND t.superintendent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = checklist_template_items.template_id AND t.superintendent_id = auth.uid()));
CREATE POLICY "members read linked checklist template items" ON public.checklist_template_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = checklist_template_items.template_id AND t.congregation_id IS NOT NULL AND t.congregation_id = private.get_user_congregation(auth.uid())));

-- field_assignments
CREATE POLICY "members read field" ON public.field_assignments FOR SELECT
  USING ((EXISTS (SELECT 1 FROM public.visits v WHERE v.id = field_assignments.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid())))
    AND (is_active OR private.can_edit_visit(auth.uid(), visit_id)));
CREATE POLICY "editors write field" ON public.field_assignments FOR INSERT
  WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update field" ON public.field_assignments FOR UPDATE
  USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes field" ON public.field_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = field_assignments.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

-- meals
CREATE POLICY "members read meals" ON public.meals FOR SELECT
  USING ((EXISTS (SELECT 1 FROM public.visits v WHERE v.id = meals.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid())))
    AND (is_active OR EXISTS (SELECT 1 FROM public.visits v2 WHERE v2.id = meals.visit_id AND private.is_superintendent_of(auth.uid(), v2.congregation_id))));
CREATE POLICY "editors insert meals" ON public.meals FOR INSERT
  WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update meals" ON public.meals FOR UPDATE
  USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes meals" ON public.meals FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = meals.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

-- schedule_events
CREATE POLICY "members read schedule" ON public.schedule_events FOR SELECT
  USING ((EXISTS (SELECT 1 FROM public.visits v WHERE v.id = schedule_events.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid())))
    AND (is_active OR EXISTS (SELECT 1 FROM public.visits v2 WHERE v2.id = schedule_events.visit_id AND private.is_superintendent_of(auth.uid(), v2.congregation_id))));
CREATE POLICY "super manages schedule" ON public.schedule_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = schedule_events.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = schedule_events.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

-- transport_schedule
CREATE POLICY "members read transport" ON public.transport_schedule FOR SELECT
  USING ((EXISTS (SELECT 1 FROM public.visits v WHERE v.id = transport_schedule.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid())))
    AND (is_active OR private.can_edit_visit(auth.uid(), visit_id)));
CREATE POLICY "editors insert transport" ON public.transport_schedule FOR INSERT
  WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update transport" ON public.transport_schedule FOR UPDATE
  USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes transport" ON public.transport_schedule FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = transport_schedule.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));
