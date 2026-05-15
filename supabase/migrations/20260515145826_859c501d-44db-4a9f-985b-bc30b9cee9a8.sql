GRANT EXECUTE ON FUNCTION public.is_superintendent_of(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_congregation(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_visit(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_congregations() TO authenticated;