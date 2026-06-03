ALTER TABLE public.congregations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.congregations;