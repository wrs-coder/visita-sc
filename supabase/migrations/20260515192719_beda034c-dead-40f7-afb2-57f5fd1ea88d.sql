
-- checklist_templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id UUID NOT NULL,
  name TEXT NOT NULL,
  congregation_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX checklist_templates_unique_cong
  ON public.checklist_templates (congregation_id)
  WHERE congregation_id IS NOT NULL;

CREATE INDEX checklist_templates_super_idx
  ON public.checklist_templates (superintendent_id);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages checklist templates"
ON public.checklist_templates
FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (superintendent_id = auth.uid() AND public.has_role(auth.uid(), 'superintendent'));

CREATE POLICY "members read linked checklist template"
ON public.checklist_templates
FOR SELECT
USING (
  congregation_id IS NOT NULL
  AND congregation_id = public.get_user_congregation(auth.uid())
);

CREATE TRIGGER touch_checklist_templates
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- checklist_template_items
CREATE TABLE public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX checklist_template_items_tpl_idx
  ON public.checklist_template_items (template_id, sort_order);

ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages checklist template items"
ON public.checklist_template_items
FOR ALL
USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.superintendent_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.superintendent_id = auth.uid()));

CREATE POLICY "members read linked checklist template items"
ON public.checklist_template_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.checklist_templates t
  WHERE t.id = template_id
    AND t.congregation_id IS NOT NULL
    AND t.congregation_id = public.get_user_congregation(auth.uid())
));

-- Limit 24 templates per superintendent
CREATE OR REPLACE FUNCTION public.enforce_checklist_template_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.checklist_templates WHERE superintendent_id = NEW.superintendent_id) >= 24 THEN
    RAISE EXCEPTION 'Limite de 24 modelos de checklist atingido.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER checklist_template_limit
BEFORE INSERT ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_template_limit();

-- Replace seed_default_checklist to use linked template when available
CREATE OR REPLACE FUNCTION public.seed_default_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl uuid;
BEGIN
  SELECT id INTO v_tpl FROM public.checklist_templates WHERE congregation_id = NEW.congregation_id LIMIT 1;

  IF v_tpl IS NOT NULL THEN
    INSERT INTO public.checklist_items (visit_id, title, description, sort_order, status)
    SELECT NEW.id, ti.title, ti.description, ti.sort_order, 'pending'
    FROM public.checklist_template_items ti
    WHERE ti.template_id = v_tpl
    ORDER BY ti.sort_order;
    RETURN NEW;
  END IF;

  -- Fallback default 13 items
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
$$;
