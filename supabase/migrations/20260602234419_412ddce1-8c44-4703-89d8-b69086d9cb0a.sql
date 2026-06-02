-- Allow elders to read elder program templates owned by the superintendent of
-- their congregation, regardless of whether the template is linked to a
-- specific congregation. The template selection happens at visit creation, so
-- a per-congregation vínculo on the template is no longer required.

DROP POLICY IF EXISTS "members read linked elder program template" ON public.elder_program_templates;
CREATE POLICY "members read elder program template"
ON public.elder_program_templates
FOR SELECT
USING (
  superintendent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.congregations c
    WHERE c.id = private.get_user_congregation(auth.uid())
      AND c.superintendent_id = elder_program_templates.superintendent_id
  )
);

DROP POLICY IF EXISTS "members read linked elder program template sections" ON public.elder_program_template_sections;
CREATE POLICY "members read elder program template sections"
ON public.elder_program_template_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elder_program_templates t
    WHERE t.id = elder_program_template_sections.template_id
      AND (
        t.superintendent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.congregations c
          WHERE c.id = private.get_user_congregation(auth.uid())
            AND c.superintendent_id = t.superintendent_id
        )
      )
  )
);

DROP POLICY IF EXISTS "members read linked elder program template slots" ON public.elder_program_template_slots;
CREATE POLICY "members read elder program template slots"
ON public.elder_program_template_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elder_program_templates t
    WHERE t.id = elder_program_template_slots.template_id
      AND (
        t.superintendent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.congregations c
          WHERE c.id = private.get_user_congregation(auth.uid())
            AND c.superintendent_id = t.superintendent_id
        )
      )
  )
);

DROP POLICY IF EXISTS "members read linked elder program template events" ON public.elder_program_template_events;
CREATE POLICY "members read elder program template events"
ON public.elder_program_template_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elder_program_templates t
    WHERE t.id = elder_program_template_events.template_id
      AND (
        t.superintendent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.congregations c
          WHERE c.id = private.get_user_congregation(auth.uid())
            AND c.superintendent_id = t.superintendent_id
        )
      )
  )
);
