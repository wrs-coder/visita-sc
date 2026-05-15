-- Position enum for elders
DO $$ BEGIN
  CREATE TYPE public.elder_position AS ENUM ('coordenador','secretario','sup_servico','corpo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS elder_position public.elder_position;

-- Helper: can the user edit collaborative info on a given visit?
CREATE OR REPLACE FUNCTION public.can_edit_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.id = _visit_id
      AND (
        public.is_superintendent_of(_user_id, v.congregation_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.congregation_id = v.congregation_id
            AND ur.role = 'elder'
            AND ur.elder_position IN ('coordenador','secretario','sup_servico')
        )
      )
  )
$$;

-- checklist_items: replace "members update" with edit-position-only
DROP POLICY IF EXISTS "members update checklist" ON public.checklist_items;
CREATE POLICY "editors update checklist"
ON public.checklist_items
FOR UPDATE
USING (public.can_edit_visit(auth.uid(), visit_id));

-- field_assignments: restrict insert + update to editors
DROP POLICY IF EXISTS "members write field" ON public.field_assignments;
DROP POLICY IF EXISTS "members update field" ON public.field_assignments;

CREATE POLICY "editors write field"
ON public.field_assignments
FOR INSERT
WITH CHECK (public.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "editors update field"
ON public.field_assignments
FOR UPDATE
USING (public.can_edit_visit(auth.uid(), visit_id));