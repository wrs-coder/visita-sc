REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_elder_tab_password(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_elder_tab_password(uuid) TO service_role;