ALTER TABLE public.schedule_events ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.field_assignments ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.meals ADD COLUMN is_active boolean NOT NULL DEFAULT true;