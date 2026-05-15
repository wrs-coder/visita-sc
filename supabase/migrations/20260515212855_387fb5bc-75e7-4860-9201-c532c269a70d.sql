-- Time column for per-visit field meetings (mirrors field_assignments.meeting_time)
ALTER TABLE public.field_meetings ADD COLUMN IF NOT EXISTS meeting_time time;

-- Items inside a field-meeting template (analogous to program_template_items)
CREATE TABLE IF NOT EXISTS public.field_meeting_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.field_meeting_templates(id) ON DELETE CASCADE,
  day_offset integer NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'Manhã',
  meeting_time time,
  territory_number text,
  territory_location text,
  closing_prayer text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS field_meeting_template_items_template_idx
  ON public.field_meeting_template_items (template_id, sort_order);

ALTER TABLE public.field_meeting_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super manages field meeting template items"
ON public.field_meeting_template_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.field_meeting_templates t
  WHERE t.id = field_meeting_template_items.template_id
    AND t.superintendent_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.field_meeting_templates t
  WHERE t.id = field_meeting_template_items.template_id
    AND t.superintendent_id = auth.uid()
));

CREATE POLICY "members read linked field meeting template items"
ON public.field_meeting_template_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.field_meeting_templates t
  WHERE t.id = field_meeting_template_items.template_id
    AND t.congregation_id IS NOT NULL
    AND t.congregation_id = private.get_user_congregation(auth.uid())
));