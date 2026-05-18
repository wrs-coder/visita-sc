
-- 1) Coluna "Local da Reunião de Campo" em field_meetings (separada de territory_location)
ALTER TABLE public.field_meetings
  ADD COLUMN IF NOT EXISTS meeting_location text;

ALTER TABLE public.field_meeting_template_items
  ADD COLUMN IF NOT EXISTS meeting_location text;

-- 2) Reunião de Meio de Semana (1 por visita)
CREATE TABLE IF NOT EXISTS public.midweek_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE,
  chairman text,
  closing_prayer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.midweek_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read midweek" ON public.midweek_meetings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = midweek_meetings.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid()))
);
CREATE POLICY "editors insert midweek" ON public.midweek_meetings FOR INSERT WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update midweek" ON public.midweek_meetings FOR UPDATE USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes midweek" ON public.midweek_meetings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = midweek_meetings.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);
CREATE TRIGGER touch_midweek BEFORE UPDATE ON public.midweek_meetings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Temas de Discurso (alimentados pelo SC, escolhidos pela congregação)
CREATE TABLE IF NOT EXISTS public.talk_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  congregation_id uuid,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.talk_themes ENABLE ROW LEVEL SECURITY;

-- Leitura: super dono, congregação vinculada pode listar
CREATE POLICY "members read talk themes" ON public.talk_themes FOR SELECT USING (
  superintendent_id = auth.uid() OR (
    congregation_id IS NOT NULL AND congregation_id = private.get_user_congregation(auth.uid())
  )
);
CREATE POLICY "super manages talk themes" ON public.talk_themes FOR ALL
  USING (superintendent_id = auth.uid())
  WITH CHECK (superintendent_id = auth.uid() AND private.has_role(auth.uid(), 'superintendent'::app_role));
CREATE TRIGGER touch_talk_themes BEFORE UPDATE ON public.talk_themes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_talk_themes_cong ON public.talk_themes(congregation_id);

-- 4) Reunião de Final de Semana
CREATE TABLE IF NOT EXISTS public.weekend_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE,
  meeting_at timestamptz,
  talk_theme_id uuid,
  talk_theme_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekend_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read weekend" ON public.weekend_meetings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = weekend_meetings.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid()))
);
CREATE POLICY "editors insert weekend" ON public.weekend_meetings FOR INSERT WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update weekend" ON public.weekend_meetings FOR UPDATE USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes weekend" ON public.weekend_meetings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = weekend_meetings.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);
CREATE TRIGGER touch_weekend BEFORE UPDATE ON public.weekend_meetings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Reunião de Pioneiros (super define data/hora originais)
CREATE TABLE IF NOT EXISTS public.pioneer_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE,
  opening_prayer text,
  closing_prayer text,
  location text,
  meeting_at timestamptz,
  super_meeting_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pioneer_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read pioneer" ON public.pioneer_meetings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = pioneer_meetings.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid()))
);
CREATE POLICY "editors insert pioneer" ON public.pioneer_meetings FOR INSERT WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update pioneer" ON public.pioneer_meetings FOR UPDATE USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes pioneer" ON public.pioneer_meetings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = pioneer_meetings.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);
CREATE TRIGGER touch_pioneer BEFORE UPDATE ON public.pioneer_meetings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Reunião de Anciãos e Servos
CREATE TABLE IF NOT EXISTS public.elders_servants_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE,
  opening_prayer text,
  closing_prayer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.elders_servants_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read elders meet" ON public.elders_servants_meetings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elders_servants_meetings.visit_id AND v.congregation_id = private.get_user_congregation(auth.uid()))
);
CREATE POLICY "editors insert elders meet" ON public.elders_servants_meetings FOR INSERT WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "editors update elders meet" ON public.elders_servants_meetings FOR UPDATE USING (private.can_edit_visit(auth.uid(), visit_id));
CREATE POLICY "super deletes elders meet" ON public.elders_servants_meetings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.visits v WHERE v.id = elders_servants_meetings.visit_id AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);
CREATE TRIGGER touch_elders_meet BEFORE UPDATE ON public.elders_servants_meetings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
