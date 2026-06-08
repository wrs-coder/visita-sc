
CREATE TABLE public.visit_template_overrides (
  visit_id uuid PRIMARY KEY REFERENCES public.visits(id) ON DELETE CASCADE,
  field_observations text,
  midweek_observations text,
  midweek_final_song text,
  weekend_opening_song text,
  weekend_closing_song text,
  weekend_observations text,
  pioneer_observations text,
  pioneer_weekday smallint,
  pioneer_meeting_time time,
  elders_observations text,
  elders_weekday smallint,
  elders_meeting_time time,
  program_general_observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_template_overrides TO authenticated;
GRANT ALL ON public.visit_template_overrides TO service_role;

ALTER TABLE public.visit_template_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT: superintendente da visita OU membro da congregação da visita
CREATE POLICY "Read overrides for visit congregation members"
ON public.visit_template_overrides FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.congregations c ON c.id = v.congregation_id
    WHERE v.id = visit_template_overrides.visit_id
      AND (
        c.superintendent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.congregation_id = v.congregation_id
        )
      )
  )
);

-- WRITE: apenas superintendente da congregação da visita
CREATE POLICY "Super writes overrides"
ON public.visit_template_overrides FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.congregations c ON c.id = v.congregation_id
    WHERE v.id = visit_template_overrides.visit_id
      AND c.superintendent_id = auth.uid()
  )
);

CREATE POLICY "Super updates overrides"
ON public.visit_template_overrides FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.congregations c ON c.id = v.congregation_id
    WHERE v.id = visit_template_overrides.visit_id
      AND c.superintendent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.congregations c ON c.id = v.congregation_id
    WHERE v.id = visit_template_overrides.visit_id
      AND c.superintendent_id = auth.uid()
  )
);

CREATE POLICY "Super deletes overrides"
ON public.visit_template_overrides FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.congregations c ON c.id = v.congregation_id
    WHERE v.id = visit_template_overrides.visit_id
      AND c.superintendent_id = auth.uid()
  )
);

CREATE TRIGGER trg_visit_template_overrides_touch
BEFORE UPDATE ON public.visit_template_overrides
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
