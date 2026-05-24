-- Adiciona FK com ON DELETE CASCADE nas tabelas operacionais ligadas a visits.
-- Limpa órfãos antes de criar a constraint para evitar falha de validação.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'schedule_events',
    'field_assignments',
    'meals',
    'meal_day_notes',
    'checklist_items',
    'transport_schedule',
    'field_meetings',
    'midweek_meetings',
    'weekend_meetings',
    'pioneer_meetings',
    'elders_servants_meetings'
  ];
  fk_name TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Limpa órfãos
    EXECUTE format(
      'DELETE FROM public.%I WHERE visit_id IS NOT NULL AND visit_id NOT IN (SELECT id FROM public.visits)',
      t
    );

    -- Remove FK existente (qualquer nome) sobre visit_id apontando para visits
    FOR fk_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE ns.nspname = 'public'
        AND cl.relname = t
        AND con.contype = 'f'
        AND EXISTS (
          SELECT 1
          FROM pg_attribute a
          WHERE a.attrelid = con.conrelid
            AND a.attnum = ANY (con.conkey)
            AND a.attname = 'visit_id'
        )
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, fk_name);
    END LOOP;

    -- Cria FK com CASCADE
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE',
      t,
      t || '_visit_id_fkey'
    );
  END LOOP;
END $$;