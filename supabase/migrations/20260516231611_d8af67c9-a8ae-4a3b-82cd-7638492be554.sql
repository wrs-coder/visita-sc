
CREATE TABLE public.meal_day_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  meal_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, meal_date)
);

ALTER TABLE public.meal_day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read meal day notes" ON public.meal_day_notes
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.visits v
          WHERE v.id = meal_day_notes.visit_id
          AND v.congregation_id = private.get_user_congregation(auth.uid()))
);

CREATE POLICY "super manages meal day notes" ON public.meal_day_notes
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.visits v
          WHERE v.id = meal_day_notes.visit_id
          AND private.is_superintendent_of(auth.uid(), v.congregation_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.visits v
          WHERE v.id = meal_day_notes.visit_id
          AND private.is_superintendent_of(auth.uid(), v.congregation_id))
);

CREATE TRIGGER meal_day_notes_touch
BEFORE UPDATE ON public.meal_day_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.program_templates
  ADD COLUMN meal_day_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
