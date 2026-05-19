-- Frente 1: padronizar modelos. Visitas passam a referenciar modelos por id explícito (igual ao modelo de programação).
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS checklist_template_id uuid,
  ADD COLUMN IF NOT EXISTS field_meeting_template_id uuid;

-- FKs com SET NULL para não quebrar visitas se um modelo for excluído.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visits_checklist_template_id_fkey'
  ) THEN
    ALTER TABLE public.visits
      ADD CONSTRAINT visits_checklist_template_id_fkey
      FOREIGN KEY (checklist_template_id) REFERENCES public.checklist_templates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visits_field_meeting_template_id_fkey'
  ) THEN
    ALTER TABLE public.visits
      ADD CONSTRAINT visits_field_meeting_template_id_fkey
      FOREIGN KEY (field_meeting_template_id) REFERENCES public.field_meeting_templates(id) ON DELETE SET NULL;
  END IF;
END $$;