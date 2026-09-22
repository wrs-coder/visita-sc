-- FASE 1 do Offline-First: carimbos de atualização + registro de exclusões.
-- Migração puramente ADITIVA: nenhuma coluna existente é alterada ou removida,
-- nenhuma política de acesso (RLS) existente é modificada.

-- 1) Coluna updated_at + gatilho de atualização nas tabelas que ainda não têm.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'visits','congregations','profiles','user_roles',
    'checklist_template_items','field_meeting_template_items',
    'meeting_talk_template_weekend_themes','program_template_items',
    'elder_program_template_slots','elder_program_visit_slots'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='updated_at'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()', t);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = format('public.%I', t)::regclass
        AND tgname = format('set_%s_updated_at', t)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
        format('set_%s_updated_at', t), t);
    END IF;
  END LOOP;
END $$;

-- 2) Registro de exclusões (tombstones) para propagar deletes a aparelhos offline.
CREATE TABLE IF NOT EXISTS public.sync_tombstones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_tombstones_deleted_at_idx
  ON public.sync_tombstones (deleted_at);
CREATE INDEX IF NOT EXISTS sync_tombstones_table_idx
  ON public.sync_tombstones (table_name, deleted_at);

GRANT SELECT ON public.sync_tombstones TO authenticated;
GRANT ALL ON public.sync_tombstones TO service_role;

ALTER TABLE public.sync_tombstones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='sync_tombstones'
      AND policyname='Authenticated can read tombstones'
  ) THEN
    CREATE POLICY "Authenticated can read tombstones"
      ON public.sync_tombstones FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 3) Função e gatilhos que gravam o tombstone ao excluir uma linha.
CREATE OR REPLACE FUNCTION public.record_sync_tombstone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sync_tombstones (table_name, row_id)
  VALUES (TG_TABLE_NAME, OLD.id);
  RETURN OLD;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND tb.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('sync_tombstones','elder_tab_password_audit')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = format('public.%I', t)::regclass
        AND tgname = format('tombstone_%s', t)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_sync_tombstone()',
        format('tombstone_%s', t), t);
    END IF;
  END LOOP;
END $$;