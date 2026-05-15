CREATE UNIQUE INDEX IF NOT EXISTS field_meeting_templates_one_per_cong
ON public.field_meeting_templates (congregation_id)
WHERE congregation_id IS NOT NULL;