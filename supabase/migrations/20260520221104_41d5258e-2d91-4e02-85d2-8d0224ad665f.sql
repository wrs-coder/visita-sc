ALTER TABLE public.meeting_talk_templates ADD COLUMN IF NOT EXISTS weekend_public_talk_theme TEXT;
ALTER TABLE public.weekend_meetings ADD COLUMN IF NOT EXISTS public_talk_theme TEXT;