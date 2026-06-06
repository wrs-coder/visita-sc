CREATE OR REPLACE FUNCTION public.set_elder_tab_password(_congregation_id uuid, _new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _new_password IS NULL OR length(trim(_new_password)) = 0 THEN
    UPDATE public.congregations
      SET elder_tab_password_hash = NULL,
          elder_tab_password_plain = NULL
      WHERE id = _congregation_id;
  ELSE
    UPDATE public.congregations
      SET elder_tab_password_hash = crypt(_new_password, gen_salt('bf')),
          elder_tab_password_plain = _new_password
      WHERE id = _congregation_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) TO service_role;