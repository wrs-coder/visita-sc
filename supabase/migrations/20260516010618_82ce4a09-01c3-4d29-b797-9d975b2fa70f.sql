
-- Clear all data
DELETE FROM public.private_notes;
DELETE FROM public.checklist_items;
DELETE FROM public.field_assignments;
DELETE FROM public.field_meetings;
DELETE FROM public.meals;
DELETE FROM public.transport_schedule;
DELETE FROM public.schedule_events;
DELETE FROM public.visits;
DELETE FROM public.checklist_template_items;
DELETE FROM public.checklist_templates;
DELETE FROM public.field_meeting_template_items;
DELETE FROM public.field_meeting_templates;
DELETE FROM public.program_template_items;
DELETE FROM public.program_templates;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM public.congregations;
DELETE FROM auth.users;

-- Prevent duplicate role rows that broke .maybeSingle() during login
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_cong_uidx
  ON public.user_roles (user_id, role, COALESCE(congregation_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Auto-create profile row on signup (so registration flows can rely on it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
