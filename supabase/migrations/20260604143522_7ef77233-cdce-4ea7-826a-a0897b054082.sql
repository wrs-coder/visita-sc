
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.visit_pending_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('field_meeting','meeting_talk','checklist','elder_program')),
  template_id uuid NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  backup_pdf_path text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visit_pending_updates_visit_idx
  ON public.visit_pending_updates(visit_id);
CREATE INDEX IF NOT EXISTS visit_pending_updates_unresolved_idx
  ON public.visit_pending_updates(visit_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_pending_updates TO authenticated;
GRANT ALL ON public.visit_pending_updates TO service_role;

ALTER TABLE public.visit_pending_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read pending updates" ON public.visit_pending_updates;
CREATE POLICY "members read pending updates"
  ON public.visit_pending_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_pending_updates.visit_id
        AND (
          v.congregation_id = private.get_user_congregation(auth.uid())
          OR private.is_superintendent_of(auth.uid(), v.congregation_id)
        )
    )
  );

DROP POLICY IF EXISTS "super manages pending updates" ON public.visit_pending_updates;
CREATE POLICY "super manages pending updates"
  ON public.visit_pending_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_pending_updates.visit_id
        AND private.is_superintendent_of(auth.uid(), v.congregation_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_pending_updates.visit_id
        AND private.is_superintendent_of(auth.uid(), v.congregation_id)
    )
  );

DROP TRIGGER IF EXISTS visit_pending_updates_touch ON public.visit_pending_updates;
CREATE TRIGGER visit_pending_updates_touch
  BEFORE UPDATE ON public.visit_pending_updates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "members read visit backups" ON storage.objects;
CREATE POLICY "members read visit backups"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'visit-backups'
    AND (
      (storage.foldername(name))[1]::uuid = private.get_user_congregation(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.congregations c
        WHERE c.id = (storage.foldername(name))[1]::uuid
          AND c.superintendent_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "service role manages visit backups" ON storage.objects;
CREATE POLICY "service role manages visit backups"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'visit-backups')
  WITH CHECK (bucket_id = 'visit-backups');

CREATE OR REPLACE FUNCTION public.cleanup_visit_pending_updates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.visit_pending_updates p
  USING public.visits v
  WHERE p.visit_id = v.id
    AND v.start_date <= CURRENT_DATE;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-visit-pending-updates') THEN
    PERFORM cron.schedule(
      'cleanup-visit-pending-updates',
      '0 4 * * *',
      $cron$ SELECT public.cleanup_visit_pending_updates(); $cron$
    );
  END IF;
END $$;
