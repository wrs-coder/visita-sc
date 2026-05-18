
-- Performance indexes: add covering indexes for the columns most used in WHERE / ORDER BY / JOIN

-- visits: filtered by congregation_id, ordered by start_date / is_active
CREATE INDEX IF NOT EXISTS idx_visits_congregation_id ON public.visits (congregation_id);
CREATE INDEX IF NOT EXISTS idx_visits_cong_active_date ON public.visits (congregation_id, is_active DESC, start_date DESC);

-- checklist_items: filtered by visit_id, ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_checklist_items_visit_id ON public.checklist_items (visit_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_visit_sort ON public.checklist_items (visit_id, sort_order);

-- field_assignments: filtered by visit_id + event_date
CREATE INDEX IF NOT EXISTS idx_field_assignments_visit_id ON public.field_assignments (visit_id);
CREATE INDEX IF NOT EXISTS idx_field_assignments_visit_date ON public.field_assignments (visit_id, event_date);

-- field_meetings: visit_id + event_date (already has idx_field_meetings_visit)
CREATE INDEX IF NOT EXISTS idx_field_meetings_visit_date ON public.field_meetings (visit_id, event_date);

-- meals: visit_id + meal_date
CREATE INDEX IF NOT EXISTS idx_meals_visit_id ON public.meals (visit_id);
CREATE INDEX IF NOT EXISTS idx_meals_visit_date ON public.meals (visit_id, meal_date);

-- schedule_events: visit_id + event_date
CREATE INDEX IF NOT EXISTS idx_schedule_events_visit_id ON public.schedule_events (visit_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_visit_date ON public.schedule_events (visit_id, event_date);

-- transport_schedule: visit_id + event_date
CREATE INDEX IF NOT EXISTS idx_transport_schedule_visit_id ON public.transport_schedule (visit_id);
CREATE INDEX IF NOT EXISTS idx_transport_schedule_visit_date ON public.transport_schedule (visit_id, event_date);

-- meal_day_notes: visit_id + meal_date (unique already exists, add visit-only for lookups)
CREATE INDEX IF NOT EXISTS idx_meal_day_notes_visit_id ON public.meal_day_notes (visit_id);

-- private_notes: filtered by visit_id and superintendent_id
CREATE INDEX IF NOT EXISTS idx_private_notes_visit_id ON public.private_notes (visit_id);
CREATE INDEX IF NOT EXISTS idx_private_notes_super_id ON public.private_notes (superintendent_id);

-- profiles: lookups by congregation_id
CREATE INDEX IF NOT EXISTS idx_profiles_congregation_id ON public.profiles (congregation_id);

-- user_roles: lookups by user_id, congregation_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_congregation_id ON public.user_roles (congregation_id);

-- congregations: lookups by superintendent_id
CREATE INDEX IF NOT EXISTS idx_congregations_superintendent_id ON public.congregations (superintendent_id);

-- program_template_items: by template_id
CREATE INDEX IF NOT EXISTS idx_program_template_items_template_id ON public.program_template_items (template_id);

-- Realtime: remove profiles (never subscribed to in app code, just wastes WAL bandwidth)
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
