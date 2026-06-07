REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_elder_tab_password(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_elder_coordinator(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.elder_tab_password_is_set(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verify_elder_tab_password(uuid, text) FROM anon, authenticated, public;