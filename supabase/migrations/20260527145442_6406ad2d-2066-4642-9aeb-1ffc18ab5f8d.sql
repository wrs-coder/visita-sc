
ALTER TABLE public.meeting_talk_template_midweek
  ADD COLUMN IF NOT EXISTS final_song TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT;

ALTER TABLE public.meeting_talk_templates
  ADD COLUMN IF NOT EXISTS weekend_opening_song TEXT,
  ADD COLUMN IF NOT EXISTS weekend_closing_song TEXT,
  ADD COLUMN IF NOT EXISTS weekend_observations TEXT;

ALTER TABLE public.meeting_talk_template_pioneer
  ADD COLUMN IF NOT EXISTS observations TEXT;

ALTER TABLE public.meeting_talk_template_elders
  ADD COLUMN IF NOT EXISTS observations TEXT;
