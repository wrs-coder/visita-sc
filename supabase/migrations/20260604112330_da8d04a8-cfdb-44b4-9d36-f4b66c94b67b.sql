ALTER TABLE public.program_templates
  ADD COLUMN IF NOT EXISTS study_general_observations text,
  ADD COLUMN IF NOT EXISTS study_day_notes jsonb NOT NULL DEFAULT '{}'::jsonb;