ALTER TABLE public.field_meeting_templates ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE public.program_templates ADD COLUMN IF NOT EXISTS general_observations text;