-- =====================================================================
-- Modelos de Reunião e Discurso (espelho do padrão de "Reuniões de Campo")
-- =====================================================================

-- 1) Tabela principal de modelos (semelhante a field_meeting_templates)
CREATE TABLE IF NOT EXISTS public.meeting_talk_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  congregation_id uuid NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Bloco Meio de Semana (uma linha por modelo)
CREATE TABLE IF NOT EXISTS public.meeting_talk_template_midweek (
  template_id uuid PRIMARY KEY REFERENCES public.meeting_talk_templates(id) ON DELETE CASCADE,
  chairman text NULL,
  closing_prayer text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Bloco Fim de Semana — múltiplos temas (gera dropdown para os anciãos)
CREATE TABLE IF NOT EXISTS public.meeting_talk_template_weekend_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.meeting_talk_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtwt_themes_template ON public.meeting_talk_template_weekend_themes(template_id);

-- 4) Bloco Pioneiros — apenas Dia da Semana (0=Seg..6=Dom) + horário
CREATE TABLE IF NOT EXISTS public.meeting_talk_template_pioneer (
  template_id uuid PRIMARY KEY REFERENCES public.meeting_talk_templates(id) ON DELETE CASCADE,
  weekday smallint NULL CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  meeting_time time NULL,
  super_meeting_weekday smallint NULL CHECK (super_meeting_weekday IS NULL OR (super_meeting_weekday >= 0 AND super_meeting_weekday <= 6)),
  super_meeting_time time NULL,
  location text NULL,
  opening_prayer text NULL,
  closing_prayer text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Bloco Anciãos e Servos (uma linha por modelo)
CREATE TABLE IF NOT EXISTS public.meeting_talk_template_elders (
  template_id uuid PRIMARY KEY REFERENCES public.meeting_talk_templates(id) ON DELETE CASCADE,
  opening_prayer text NULL,
  closing_prayer text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) Vinculação obrigatória no Itinerário (uma coluna em visits)
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS meeting_talk_template_id uuid NULL;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trg_mtt_touch ON public.meeting_talk_templates;
CREATE TRIGGER trg_mtt_touch BEFORE UPDATE ON public.meeting_talk_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_mttm_touch ON public.meeting_talk_template_midweek;
CREATE TRIGGER trg_mttm_touch BEFORE UPDATE ON public.meeting_talk_template_midweek
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_mttp_touch ON public.meeting_talk_template_pioneer;
CREATE TRIGGER trg_mttp_touch BEFORE UPDATE ON public.meeting_talk_template_pioneer
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_mtte_touch ON public.meeting_talk_template_elders;
CREATE TRIGGER trg_mtte_touch BEFORE UPDATE ON public.meeting_talk_template_elders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.meeting_talk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_talk_template_midweek ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_talk_template_weekend_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_talk_template_pioneer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_talk_template_elders ENABLE ROW LEVEL SECURITY;

-- Pai: superintendente dono pode tudo; membros da congregação vinculada podem SELECT
DROP POLICY IF EXISTS "super manages meeting talk templates" ON public.meeting_talk_templates;
CREATE POLICY "super manages meeting talk templates"
  ON public.meeting_talk_templates FOR ALL
  USING (superintendent_id = auth.uid())
  WITH CHECK (superintendent_id = auth.uid() AND private.has_role(auth.uid(), 'superintendent'::app_role));

DROP POLICY IF EXISTS "members read linked meeting talk template" ON public.meeting_talk_templates;
CREATE POLICY "members read linked meeting talk template"
  ON public.meeting_talk_templates FOR SELECT
  USING (congregation_id IS NOT NULL AND congregation_id = private.get_user_congregation(auth.uid()));

-- Filhas (mesma lógica via parent): super = ALL; membros = SELECT quando o template tem congregation vinculada
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'meeting_talk_template_midweek',
    'meeting_talk_template_weekend_themes',
    'meeting_talk_template_pioneer',
    'meeting_talk_template_elders'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "super manages %1$s" ON public.%1$s;', t);
    EXECUTE format($p$
      CREATE POLICY "super manages %1$s" ON public.%1$s FOR ALL
        USING (EXISTS (SELECT 1 FROM public.meeting_talk_templates pt
                       WHERE pt.id = %1$s.template_id AND pt.superintendent_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM public.meeting_talk_templates pt
                            WHERE pt.id = %1$s.template_id AND pt.superintendent_id = auth.uid()));
    $p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "members read linked %1$s" ON public.%1$s;', t);
    EXECUTE format($p$
      CREATE POLICY "members read linked %1$s" ON public.%1$s FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.meeting_talk_templates pt
                       WHERE pt.id = %1$s.template_id
                         AND pt.congregation_id IS NOT NULL
                         AND pt.congregation_id = private.get_user_congregation(auth.uid())));
    $p$, t);
  END LOOP;
END $$;