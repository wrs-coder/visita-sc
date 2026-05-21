ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS substitute_name text,
  ADD COLUMN IF NOT EXISTS substitute_phone text;