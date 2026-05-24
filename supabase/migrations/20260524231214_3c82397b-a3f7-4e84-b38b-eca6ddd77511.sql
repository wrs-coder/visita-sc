
-- 1) Limpa registros órfãos (visit_id sem visita correspondente)
DELETE FROM public.midweek_meetings        WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.weekend_meetings        WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.pioneer_meetings        WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.elders_servants_meetings WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.field_meetings          WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.field_assignments       WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.schedule_events         WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.meals                   WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.meal_day_notes          WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.checklist_items         WHERE visit_id NOT IN (SELECT id FROM public.visits);
DELETE FROM public.transport_schedule      WHERE visit_id NOT IN (SELECT id FROM public.visits);

-- Notas privadas: setar visit_id para NULL quando órfão (preservar histórico)
UPDATE public.private_notes SET visit_id = NULL
WHERE visit_id IS NOT NULL AND visit_id NOT IN (SELECT id FROM public.visits);

-- Visits órfãs por congregation inexistente
DELETE FROM public.visits WHERE congregation_id NOT IN (SELECT id FROM public.congregations);

-- 2) Drop FKs existentes e recria com ON DELETE CASCADE
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'visit_id'
      AND tc.table_name IN (
        'schedule_events','field_assignments','meals','checklist_items',
        'midweek_meetings','weekend_meetings','pioneer_meetings',
        'elders_servants_meetings','field_meetings','transport_schedule','meal_day_notes'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
  END LOOP;

  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'visits'
      AND kcu.column_name = 'congregation_id'
  LOOP
    EXECUTE format('ALTER TABLE public.visits DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.schedule_events         ADD CONSTRAINT schedule_events_visit_id_fkey         FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.field_assignments       ADD CONSTRAINT field_assignments_visit_id_fkey       FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.meals                   ADD CONSTRAINT meals_visit_id_fkey                   FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.checklist_items         ADD CONSTRAINT checklist_items_visit_id_fkey         FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.midweek_meetings        ADD CONSTRAINT midweek_meetings_visit_id_fkey        FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.weekend_meetings        ADD CONSTRAINT weekend_meetings_visit_id_fkey        FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.pioneer_meetings        ADD CONSTRAINT pioneer_meetings_visit_id_fkey        FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.elders_servants_meetings ADD CONSTRAINT elders_servants_meetings_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.field_meetings          ADD CONSTRAINT field_meetings_visit_id_fkey          FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.transport_schedule      ADD CONSTRAINT transport_schedule_visit_id_fkey      FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
ALTER TABLE public.meal_day_notes          ADD CONSTRAINT meal_day_notes_visit_id_fkey          FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;

ALTER TABLE public.visits                  ADD CONSTRAINT visits_congregation_id_fkey           FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Garantir SET NULL em private_notes.visit_id (caso ainda esteja ausente/diferente)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'private_notes'
      AND kcu.column_name = 'visit_id'
  LOOP
    EXECUTE format('ALTER TABLE public.private_notes DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.private_notes
  ADD CONSTRAINT private_notes_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;
