GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_templates TO authenticated;
GRANT ALL ON public.program_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_template_items TO authenticated;
GRANT ALL ON public.program_template_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_schedule TO authenticated;
GRANT ALL ON public.transport_schedule TO service_role;