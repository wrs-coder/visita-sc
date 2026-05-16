ALTER TABLE public.field_meeting_template_items ADD COLUMN IF NOT EXISTS auxiliary_leaders text;
ALTER TABLE public.field_meetings ADD COLUMN IF NOT EXISTS auxiliary_leaders text;