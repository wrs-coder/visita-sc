-- ============================================================
-- Migration consolidada (Fase B)
-- 1) visits.last_applied_at
-- 2) novas colunas em transport_schedule + backfill weekday
-- 3) tabela personal_outlines com RLS e limite de 10/usuário
-- Todas as mudanças são aditivas; dados existentes preservados.
-- ============================================================

-- 1) visits.last_applied_at
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS last_applied_at TIMESTAMPTZ;

-- 2) transport_schedule: novas colunas (todas nullable ou com default)
ALTER TABLE public.transport_schedule
  ADD COLUMN IF NOT EXISTS weekday        SMALLINT,
  ADD COLUMN IF NOT EXISTS event_type     TEXT,
  ADD COLUMN IF NOT EXISTS direction      TEXT,
  ADD COLUMN IF NOT EXISTS all_day        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS departure_time TIME,
  ADD COLUMN IF NOT EXISTS return_time    TIME;

-- 2b) Backfill weekday a partir de event_date existente (não destrutivo)
UPDATE public.transport_schedule
   SET weekday = EXTRACT(DOW FROM event_date)::smallint
 WHERE event_date IS NOT NULL AND weekday IS NULL;

-- 3) Tabela personal_outlines (esboços pessoais na nuvem)
CREATE TABLE IF NOT EXISTS public.personal_outlines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_path  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_outlines TO authenticated;
GRANT ALL ON public.personal_outlines TO service_role;

ALTER TABLE public.personal_outlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own outlines"   ON public.personal_outlines;
DROP POLICY IF EXISTS "users insert own outlines" ON public.personal_outlines;
DROP POLICY IF EXISTS "users update own outlines" ON public.personal_outlines;
DROP POLICY IF EXISTS "users delete own outlines" ON public.personal_outlines;

CREATE POLICY "users read own outlines"   ON public.personal_outlines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own outlines" ON public.personal_outlines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own outlines" ON public.personal_outlines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own outlines" ON public.personal_outlines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_personal_outlines_updated ON public.personal_outlines;
CREATE TRIGGER trg_personal_outlines_updated
  BEFORE UPDATE ON public.personal_outlines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Limite de 10 esboços por usuário
CREATE OR REPLACE FUNCTION public.enforce_personal_outlines_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.personal_outlines WHERE user_id = NEW.user_id;
  IF total >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 esboços na nuvem atingido.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_personal_outlines_limit ON public.personal_outlines;
CREATE TRIGGER trg_personal_outlines_limit
  BEFORE INSERT ON public.personal_outlines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_personal_outlines_limit();
