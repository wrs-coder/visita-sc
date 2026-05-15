
-- Enum for preaching modality
CREATE TYPE public.field_modality AS ENUM (
  'casa_em_casa',
  'estudos_revisitas',
  'telefone',
  'cartas',
  'telefone_cartas',
  'grupo_de_campo'
);

-- Per-visit field meetings rows
CREATE TABLE public.field_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL,
  event_date DATE NOT NULL,
  period TEXT NOT NULL,
  territory_number TEXT,
  territory_location TEXT,
  closing_prayer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_meetings_visit ON public.field_meetings(visit_id);

ALTER TABLE public.field_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read field meetings"
ON public.field_meetings FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM public.visits v
    WHERE v.id = field_meetings.visit_id
      AND v.congregation_id = private.get_user_congregation(auth.uid())))
  AND (is_active OR private.can_edit_visit(auth.uid(), visit_id))
);

CREATE POLICY "editors insert field meetings"
ON public.field_meetings FOR INSERT
WITH CHECK (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "editors update field meetings"
ON public.field_meetings FOR UPDATE
USING (private.can_edit_visit(auth.uid(), visit_id));

CREATE POLICY "super deletes field meetings"
ON public.field_meetings FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.visits v
    WHERE v.id = field_meetings.visit_id
      AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);

CREATE TRIGGER trg_field_meetings_updated_at
BEFORE UPDATE ON public.field_meetings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Templates: 1 modality per congregation
CREATE TABLE public.field_meeting_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  superintendent_id UUID NOT NULL,
  congregation_id UUID,
  name TEXT NOT NULL,
  modality public.field_modality NOT NULL DEFAULT 'casa_em_casa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_field_meeting_templates_cong
  ON public.field_meeting_templates(congregation_id)
  WHERE congregation_id IS NOT NULL;

ALTER TABLE public.field_meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages field meeting templates"
ON public.field_meeting_templates FOR ALL
USING (superintendent_id = auth.uid())
WITH CHECK (superintendent_id = auth.uid()
  AND private.has_role(auth.uid(), 'superintendent'::app_role));

CREATE POLICY "members read linked field meeting template"
ON public.field_meeting_templates FOR SELECT
USING (
  congregation_id IS NOT NULL
  AND congregation_id = private.get_user_congregation(auth.uid())
);

CREATE TRIGGER trg_field_meeting_templates_updated_at
BEFORE UPDATE ON public.field_meeting_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
