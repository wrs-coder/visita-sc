
-- AJUSTE 01: New default checklist items
CREATE OR REPLACE FUNCTION public.seed_default_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.checklist_items (visit_id, title, description, sort_order, status) VALUES
    (NEW.id, 'Quantos Publicadores Ativos?', NULL, 10, 'pending'),
    (NEW.id, 'Quantos inativos a vários anos?', NULL, 20, 'pending'),
    (NEW.id, 'Quantos pioneiros auxiliares para este mês da visita?', NULL, 30, 'pending'),
    (NEW.id, 'Quais são as maiores dificuldades que os membros da congregação tem enfrentado nos últimos 3 meses?', NULL, 40, 'pending'),
    (NEW.id, 'Quantos: Novos Publicadores', NULL, 50, 'pending'),
    (NEW.id, 'Quantos: Novos Batizados', NULL, 60, 'pending'),
    (NEW.id, 'Quantos: Chegaram', NULL, 70, 'pending'),
    (NEW.id, 'Quantos: Partiram', NULL, 80, 'pending'),
    (NEW.id, 'Quantos: Inativos', NULL, 90, 'pending'),
    (NEW.id, 'Quantos: Reativados', NULL, 100, 'pending'),
    (NEW.id, 'Quantos: Deixou de ser Publicador', NULL, 110, 'pending'),
    (NEW.id, 'Quantos: Removidos', NULL, 120, 'pending'),
    (NEW.id, 'Quantos: Readmitidos', NULL, 130, 'pending');
  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS seed_default_checklist_trigger ON public.visits;
CREATE TRIGGER seed_default_checklist_trigger
AFTER INSERT ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.seed_default_checklist();

-- AJUSTE 03: meals - add contact_phone, allow editors (anciãos com permissão) to add/edit
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS contact_phone text;

DROP POLICY IF EXISTS "super manages meals" ON public.meals;

CREATE POLICY "editors insert meals" ON public.meals
FOR INSERT WITH CHECK (public.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "editors update meals" ON public.meals
FOR UPDATE USING (public.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "super deletes meals" ON public.meals
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.visits v
  WHERE v.id = meals.visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id)
));
