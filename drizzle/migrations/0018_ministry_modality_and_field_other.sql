ALTER TABLE public.field_assignments ADD COLUMN IF NOT EXISTS ministry_modality text;
COMMENT ON COLUMN public.field_assignments.ministry_modality IS 'Companhia (Ministério): estudos|revisitas|estudos_revisitas|carrinho|casa_em_casa|outro:<texto>; NULL = estudos_revisitas';
ALTER TYPE public.field_modality ADD VALUE IF NOT EXISTS 'outro';
ALTER TABLE public.field_meeting_templates ADD COLUMN IF NOT EXISTS modality_other text;
ALTER TABLE public.field_meeting_template_items ADD COLUMN IF NOT EXISTS modality_other text;
ALTER TABLE public.field_meetings ADD COLUMN IF NOT EXISTS modality_other text;