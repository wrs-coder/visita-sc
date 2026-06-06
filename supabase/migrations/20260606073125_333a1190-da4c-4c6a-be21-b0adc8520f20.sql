CREATE OR REPLACE FUNCTION public.set_elder_tab_password(_congregation_id uuid, _new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_elder boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'elder'
      AND ur.congregation_id = _congregation_id
  ) INTO _is_elder;

  IF NOT _is_elder THEN
    RAISE EXCEPTION 'Apenas anciãos cadastrados podem definir essa senha.';
  END IF;

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

CREATE OR REPLACE FUNCTION public.get_elder_tab_password(_congregation_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_elder boolean;
  _plain text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'elder'
      AND ur.congregation_id = _congregation_id
  ) INTO _is_elder;

  IF NOT _is_elder THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT elder_tab_password_plain INTO _plain
    FROM public.congregations WHERE id = _congregation_id;
  RETURN _plain;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_elder_tab_password(uuid) TO authenticated;