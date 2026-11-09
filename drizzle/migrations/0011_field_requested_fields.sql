ALTER TABLE public.field_meeting_template_items ADD COLUMN IF NOT EXISTS requested_fields text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.field_meetings ADD COLUMN IF NOT EXISTS requested_fields text[];
UPDATE public.field_meeting_template_items SET requested_fields = ARRAY['territory_number','territory_location','auxiliary_leaders','closing_prayer'];
COMMENT ON COLUMN public.field_meeting_template_items.requested_fields IS 'Optional field items the superintendent asks elders to fill (territory_number, territory_location, auxiliary_leaders, closing_prayer).';
COMMENT ON COLUMN public.field_meetings.requested_fields IS 'Copied from the template on apply. NULL = legacy row, show all optional items.';