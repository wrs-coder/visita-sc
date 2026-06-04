
REVOKE EXECUTE ON FUNCTION public.cleanup_visit_pending_updates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_visit_pending_updates() TO service_role, postgres;
