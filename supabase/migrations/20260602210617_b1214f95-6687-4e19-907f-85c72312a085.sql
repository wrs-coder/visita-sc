ALTER TABLE public.elders_servants_meetings
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_at timestamptz;