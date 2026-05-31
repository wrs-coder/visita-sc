-- Soft-delete columns
ALTER TABLE public.private_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_private_notes_deleted_at
  ON public.private_notes(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE public.personal_outlines
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_personal_outlines_deleted_at
  ON public.personal_outlines(deleted_at) WHERE deleted_at IS NOT NULL;

-- Remove limite artificial de 10 esboços (trigger + função)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.personal_outlines'::regclass
      AND NOT tgisinternal
      AND tgname ILIKE '%personal_outlines_limit%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.personal_outlines', r.tgname);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.enforce_personal_outlines_limit();

-- Purga diária dos itens com mais de 30 dias na lixeira
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento prévio se existir (idempotência)
DO $$
BEGIN
  PERFORM cron.unschedule('purge-soft-deleted-30d');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-soft-deleted-30d',
  '0 3 * * *',
  $$
    DELETE FROM public.private_notes
      WHERE deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days';
    DELETE FROM public.personal_outlines
      WHERE deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days';
  $$
);