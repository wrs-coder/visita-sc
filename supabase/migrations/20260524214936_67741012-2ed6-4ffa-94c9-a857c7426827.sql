ALTER TABLE public.private_notes DROP CONSTRAINT IF EXISTS private_notes_visit_id_fkey;
ALTER TABLE public.private_notes ALTER COLUMN visit_id DROP NOT NULL;
ALTER TABLE public.private_notes
  ADD CONSTRAINT private_notes_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;