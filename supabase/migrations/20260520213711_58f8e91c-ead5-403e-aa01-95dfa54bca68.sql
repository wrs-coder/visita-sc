ALTER TABLE public.meeting_talk_template_midweek
ADD COLUMN IF NOT EXISTS service_talk_theme text;

ALTER TABLE public.meeting_talk_template_pioneer
ADD COLUMN IF NOT EXISTS theme text;

ALTER TABLE public.meeting_talk_template_elders
ADD COLUMN IF NOT EXISTS theme text;

ALTER TABLE public.midweek_meetings
ADD COLUMN IF NOT EXISTS service_talk_theme text;

ALTER TABLE public.pioneer_meetings
ADD COLUMN IF NOT EXISTS theme text;

ALTER TABLE public.elders_servants_meetings
ADD COLUMN IF NOT EXISTS theme text;