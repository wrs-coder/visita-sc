REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_elder_tab_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.elder_tab_password_is_set(uuid) FROM PUBLIC, anon, authenticated;