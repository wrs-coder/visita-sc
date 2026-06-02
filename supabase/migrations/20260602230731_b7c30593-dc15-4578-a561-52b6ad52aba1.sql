
-- ===== ENUMS =====
CREATE TYPE public.elder_program_section AS ENUM ('pastoral','encouragement','recommendations','local');
CREATE TYPE public.elder_encouragement_category AS ENUM ('inactive','sick','special_privileges');
CREATE TYPE public.elder_recommendation_purpose AS ENUM ('ministerial_servant','elder','redesignation','removal','cca_change');
CREATE TYPE public.elder_event_source AS ENUM ('template','manual');

-- ===== MODELOS =====
CREATE TABLE public.elder_program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id UUID NOT NULL,
  congregation_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_templates TO authenticated;
GRANT ALL ON public.elder_program_templates TO service_role;
ALTER TABLE public.elder_program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages elder program templates"
ON public.elder_program_templates FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (superintendent_id = auth.uid() AND private.has_role(auth.uid(), 'superintendent'::app_role));

CREATE POLICY "members read linked elder program template"
ON public.elder_program_templates FOR SELECT
USING (congregation_id IS NOT NULL AND congregation_id = private.get_user_congregation(auth.uid()));

CREATE TRIGGER elder_program_templates_touch BEFORE UPDATE ON public.elder_program_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== SEÇÕES (additional_info por seção) =====
CREATE TABLE public.elder_program_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.elder_program_templates(id) ON DELETE CASCADE,
  section public.elder_program_section NOT NULL,
  additional_info TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_template_sections TO authenticated;
GRANT ALL ON public.elder_program_template_sections TO service_role;
ALTER TABLE public.elder_program_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read linked elder program template sections"
ON public.elder_program_template_sections FOR SELECT
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t
  WHERE t.id = elder_program_template_sections.template_id
    AND t.congregation_id IS NOT NULL AND t.congregation_id = private.get_user_congregation(auth.uid())));

CREATE POLICY "super manages elder program template sections"
ON public.elder_program_template_sections FOR ALL
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_sections.template_id AND t.superintendent_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_sections.template_id AND t.superintendent_id = auth.uid()));

CREATE TRIGGER elder_program_template_sections_touch BEFORE UPDATE ON public.elder_program_template_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== SLOTS (Seção 01) =====
CREATE TABLE public.elder_program_template_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.elder_program_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_template_slots TO authenticated;
GRANT ALL ON public.elder_program_template_slots TO service_role;
ALTER TABLE public.elder_program_template_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read linked elder program template slots"
ON public.elder_program_template_slots FOR SELECT
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t
  WHERE t.id = elder_program_template_slots.template_id
    AND t.congregation_id IS NOT NULL AND t.congregation_id = private.get_user_congregation(auth.uid())));

CREATE POLICY "super manages elder program template slots"
ON public.elder_program_template_slots FOR ALL
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_slots.template_id AND t.superintendent_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_slots.template_id AND t.superintendent_id = auth.uid()));

-- ===== EVENTS DO MODELO =====
CREATE TABLE public.elder_program_template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.elder_program_templates(id) ON DELETE CASCADE,
  section public.elder_program_section NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- pastoral
  slot_label TEXT,
  companion TEXT,
  family_name TEXT,
  address TEXT,
  family_members TEXT,
  spiritual_info TEXT,
  -- encouragement
  category public.elder_encouragement_category,
  person_name TEXT,
  contact TEXT,
  health_info TEXT,
  -- recommendations
  purpose public.elder_recommendation_purpose,
  full_name TEXT,
  field_group TEXT,
  info TEXT,
  -- local matters
  suggested_by TEXT,
  subject TEXT,
  sources TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_template_events TO authenticated;
GRANT ALL ON public.elder_program_template_events TO service_role;
ALTER TABLE public.elder_program_template_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read linked elder program template events"
ON public.elder_program_template_events FOR SELECT
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t
  WHERE t.id = elder_program_template_events.template_id
    AND t.congregation_id IS NOT NULL AND t.congregation_id = private.get_user_congregation(auth.uid())));

CREATE POLICY "super manages elder program template events"
ON public.elder_program_template_events FOR ALL
USING (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_events.template_id AND t.superintendent_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.elder_program_templates t WHERE t.id = elder_program_template_events.template_id AND t.superintendent_id = auth.uid()));

CREATE TRIGGER elder_program_template_events_touch BEFORE UPDATE ON public.elder_program_template_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== VISITA: vínculo =====
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS elder_program_template_id UUID;

-- ===== VISITA: snapshot info adicional por seção =====
CREATE TABLE public.elder_program_visit_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  section public.elder_program_section NOT NULL,
  additional_info TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visit_id, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_visit_sections TO authenticated;
GRANT ALL ON public.elder_program_visit_sections TO service_role;
ALTER TABLE public.elder_program_visit_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder visit sections"
ON public.elder_program_visit_sections FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v
  WHERE v.id = elder_program_visit_sections.visit_id
    AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "super manages elder visit sections"
ON public.elder_program_visit_sections FOR ALL
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_program_visit_sections.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_program_visit_sections.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE TRIGGER elder_program_visit_sections_touch BEFORE UPDATE ON public.elder_program_visit_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== VISITA: slots snapshot =====
CREATE TABLE public.elder_program_visit_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_program_visit_slots TO authenticated;
GRANT ALL ON public.elder_program_visit_slots TO service_role;
ALTER TABLE public.elder_program_visit_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder visit slots"
ON public.elder_program_visit_slots FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v
  WHERE v.id = elder_program_visit_slots.visit_id
    AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "super manages elder visit slots"
ON public.elder_program_visit_slots FOR ALL
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_program_visit_slots.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_program_visit_slots.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

-- ===== VISITA: 4 tabelas de eventos =====
-- 01 Pastoral
CREATE TABLE public.elder_pastoral_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  source public.elder_event_source NOT NULL DEFAULT 'manual',
  template_event_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  slot_label TEXT,
  companion TEXT,
  family_name TEXT,
  address TEXT,
  family_members TEXT,
  spiritual_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_pastoral_visits TO authenticated;
GRANT ALL ON public.elder_pastoral_visits TO service_role;
ALTER TABLE public.elder_pastoral_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder pastoral"
ON public.elder_pastoral_visits FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_pastoral_visits.visit_id
  AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "editors update elder pastoral"
ON public.elder_pastoral_visits FOR UPDATE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "super inserts elder pastoral"
ON public.elder_pastoral_visits FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_pastoral_visits.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE POLICY "super deletes elder pastoral"
ON public.elder_pastoral_visits FOR DELETE
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_pastoral_visits.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE TRIGGER elder_pastoral_visits_touch BEFORE UPDATE ON public.elder_pastoral_visits
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 02 Encouragement
CREATE TABLE public.elder_encouragements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  source public.elder_event_source NOT NULL DEFAULT 'manual',
  template_event_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  category public.elder_encouragement_category,
  person_name TEXT,
  address TEXT,
  contact TEXT,
  health_info TEXT,
  spiritual_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_encouragements TO authenticated;
GRANT ALL ON public.elder_encouragements TO service_role;
ALTER TABLE public.elder_encouragements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder encouragements"
ON public.elder_encouragements FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_encouragements.visit_id
  AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "editors update elder encouragements"
ON public.elder_encouragements FOR UPDATE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "super inserts elder encouragements"
ON public.elder_encouragements FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_encouragements.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE POLICY "super deletes elder encouragements"
ON public.elder_encouragements FOR DELETE
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_encouragements.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE TRIGGER elder_encouragements_touch BEFORE UPDATE ON public.elder_encouragements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 03 Recommendations (anciãos podem inserir)
CREATE TABLE public.elder_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  source public.elder_event_source NOT NULL DEFAULT 'manual',
  template_event_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  purpose public.elder_recommendation_purpose,
  full_name TEXT,
  family_members TEXT,
  field_group TEXT,
  info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_recommendations TO authenticated;
GRANT ALL ON public.elder_recommendations TO service_role;
ALTER TABLE public.elder_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder recommendations"
ON public.elder_recommendations FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_recommendations.visit_id
  AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "editors update elder recommendations"
ON public.elder_recommendations FOR UPDATE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "editors insert elder recommendations"
ON public.elder_recommendations FOR INSERT
WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "editors delete elder recommendations"
ON public.elder_recommendations FOR DELETE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE TRIGGER elder_recommendations_touch BEFORE UPDATE ON public.elder_recommendations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 04 Local matters
CREATE TABLE public.elder_local_matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  source public.elder_event_source NOT NULL DEFAULT 'manual',
  template_event_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  suggested_by TEXT,
  subject TEXT,
  sources TEXT,
  info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elder_local_matters TO authenticated;
GRANT ALL ON public.elder_local_matters TO service_role;
ALTER TABLE public.elder_local_matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elder local matters"
ON public.elder_local_matters FOR SELECT
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_local_matters.visit_id
  AND (v.congregation_id = private.get_user_congregation(auth.uid()) OR private.is_superintendent_of(auth.uid(), v.congregation_id))));

CREATE POLICY "editors update elder local matters"
ON public.elder_local_matters FOR UPDATE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "super inserts elder local matters"
ON public.elder_local_matters FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_local_matters.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE POLICY "super deletes elder local matters"
ON public.elder_local_matters FOR DELETE
USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elder_local_matters.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id)));

CREATE TRIGGER elder_local_matters_touch BEFORE UPDATE ON public.elder_local_matters
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Índices úteis =====
CREATE INDEX idx_elder_pastoral_visits_visit ON public.elder_pastoral_visits(visit_id);
CREATE INDEX idx_elder_encouragements_visit ON public.elder_encouragements(visit_id);
CREATE INDEX idx_elder_recommendations_visit ON public.elder_recommendations(visit_id);
CREATE INDEX idx_elder_local_matters_visit ON public.elder_local_matters(visit_id);
CREATE INDEX idx_elder_program_visit_sections_visit ON public.elder_program_visit_sections(visit_id);
CREATE INDEX idx_elder_program_visit_slots_visit ON public.elder_program_visit_slots(visit_id);
CREATE INDEX idx_elder_program_template_events_template ON public.elder_program_template_events(template_id, section, sort_order);
CREATE INDEX idx_elder_program_template_slots_template ON public.elder_program_template_slots(template_id, sort_order);
