
-- Enums
CREATE TYPE public.app_role AS ENUM ('superintendent', 'elder');
CREATE TYPE public.event_type AS ENUM ('field_morning','field_afternoon','elders_meeting','pioneers_meeting','midweek_meeting','weekend_meeting','other');
CREATE TYPE public.meal_type AS ENUM ('lunch','dinner','breakfast');
CREATE TYPE public.checklist_status AS ENUM ('pending','done');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  congregation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Congregations
CREATE TABLE public.congregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  superintendent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_congregation_fk FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, congregation_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_congregation(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT congregation_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_superintendent_of(_user_id UUID, _congregation_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.congregations WHERE id = _congregation_id AND superintendent_id = _user_id)
$$;

-- Visits
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Schedule events
CREATE TABLE public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  type event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- Field service assignments
CREATE TABLE public.field_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  period TEXT NOT NULL,
  meeting_point TEXT,
  meeting_time TIME,
  dirigente TEXT,
  piloto TEXT,
  acompanhante TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.field_assignments ENABLE ROW LEVEL SECURITY;

-- Meals
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  meal_date DATE NOT NULL,
  type meal_type NOT NULL,
  host_name TEXT NOT NULL,
  location TEXT,
  meal_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Checklist
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  info_text TEXT,
  link_or_notes TEXT,
  status checklist_status NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Private notes (only superintendent)
CREATE TABLE public.private_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  superintendent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER t_se_updated BEFORE UPDATE ON public.schedule_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_fa_updated BEFORE UPDATE ON public.field_assignments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_meals_updated BEFORE UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_chk_updated BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_pn_updated BEFORE UPDATE ON public.private_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====== RLS POLICIES ======

-- profiles
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users see same congregation profiles" ON public.profiles FOR SELECT USING (
  congregation_id IS NOT NULL AND congregation_id = public.get_user_congregation(auth.uid())
);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles: read-only for users on themselves; writes via security definer functions
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "supers read congregation roles" ON public.user_roles FOR SELECT USING (
  congregation_id IS NOT NULL AND public.is_superintendent_of(auth.uid(), congregation_id)
);

-- congregations: members see their congregation; superintendent manages
CREATE POLICY "members see congregation" ON public.congregations FOR SELECT USING (
  id = public.get_user_congregation(auth.uid()) OR superintendent_id = auth.uid()
);
CREATE POLICY "super updates congregation" ON public.congregations FOR UPDATE USING (superintendent_id = auth.uid());
CREATE POLICY "super deletes congregation" ON public.congregations FOR DELETE USING (superintendent_id = auth.uid());

-- visits
CREATE POLICY "members see visits" ON public.visits FOR SELECT USING (
  congregation_id = public.get_user_congregation(auth.uid())
);
CREATE POLICY "super manages visits" ON public.visits FOR ALL USING (
  public.is_superintendent_of(auth.uid(), congregation_id)
) WITH CHECK (public.is_superintendent_of(auth.uid(), congregation_id));

-- schedule_events: members read; super manages
CREATE POLICY "members read schedule" ON public.schedule_events FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "super manages schedule" ON public.schedule_events FOR ALL USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);

-- field_assignments: members read; both elders & super write
CREATE POLICY "members read field" ON public.field_assignments FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "members write field" ON public.field_assignments FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "members update field" ON public.field_assignments FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "super deletes field" ON public.field_assignments FOR DELETE USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);

-- meals
CREATE POLICY "members read meals" ON public.meals FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "super manages meals" ON public.meals FOR ALL USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);

-- checklist_items: members read & update (collaboration); super manages all
CREATE POLICY "members read checklist" ON public.checklist_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "members update checklist" ON public.checklist_items FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND v.congregation_id = public.get_user_congregation(auth.uid()))
);
CREATE POLICY "super inserts checklist" ON public.checklist_items FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);
CREATE POLICY "super deletes checklist" ON public.checklist_items FOR DELETE USING (
  EXISTS(SELECT 1 FROM public.visits v WHERE v.id = visit_id AND public.is_superintendent_of(auth.uid(), v.congregation_id))
);

-- private_notes: only the superintendent owner
CREATE POLICY "owner reads private notes" ON public.private_notes FOR SELECT USING (superintendent_id = auth.uid());
CREATE POLICY "owner writes private notes" ON public.private_notes FOR ALL USING (superintendent_id = auth.uid()) WITH CHECK (superintendent_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
