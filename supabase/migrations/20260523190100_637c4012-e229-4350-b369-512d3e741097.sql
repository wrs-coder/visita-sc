
-- 1. Add congregation_id column
ALTER TABLE public.private_notes
  ADD COLUMN IF NOT EXISTS congregation_id uuid;

-- 2. Backfill from existing visit links
UPDATE public.private_notes pn
SET congregation_id = v.congregation_id
FROM public.visits v
WHERE pn.visit_id = v.id
  AND pn.congregation_id IS NULL;

-- 3. Make visit_id optional
ALTER TABLE public.private_notes
  ALTER COLUMN visit_id DROP NOT NULL;

-- 4. Add FK to congregations and to visits with safe ON DELETE behavior.
--    visit_id -> SET NULL keeps notes when a visit is removed.
--    congregation_id -> CASCADE only if a congregation itself is removed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_notes_visit_id_fkey'
  ) THEN
    ALTER TABLE public.private_notes
      ADD CONSTRAINT private_notes_visit_id_fkey
      FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_notes_congregation_id_fkey'
  ) THEN
    ALTER TABLE public.private_notes
      ADD CONSTRAINT private_notes_congregation_id_fkey
      FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Rewrite RLS: notes belong to the owning superintendent + congregation,
--    no longer require an active visit.
DROP POLICY IF EXISTS "super reads own congregation notes" ON public.private_notes;
DROP POLICY IF EXISTS "super writes own congregation notes" ON public.private_notes;

CREATE POLICY "super reads notes by congregation"
ON public.private_notes
FOR SELECT
USING (
  superintendent_id = auth.uid()
  AND congregation_id IS NOT NULL
  AND private.is_superintendent_of(auth.uid(), congregation_id)
);

CREATE POLICY "super writes notes by congregation"
ON public.private_notes
FOR ALL
USING (
  superintendent_id = auth.uid()
  AND congregation_id IS NOT NULL
  AND private.is_superintendent_of(auth.uid(), congregation_id)
)
WITH CHECK (
  superintendent_id = auth.uid()
  AND congregation_id IS NOT NULL
  AND private.is_superintendent_of(auth.uid(), congregation_id)
);

CREATE INDEX IF NOT EXISTS private_notes_cong_super_idx
  ON public.private_notes (congregation_id, superintendent_id);
