-- Coluna em texto puro para que os anciãos cadastrados possam visualizar a senha.
ALTER TABLE public.congregations
  ADD COLUMN IF NOT EXISTS elder_tab_password_plain text;

-- set_elder_tab_password: agora exige que o caller seja coordenador (role=elder, elder_position=coordenador)
CREATE OR REPLACE FUNCTION public.set_elder_tab_password(_congregation_id uuid, _new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_coord boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'elder'
      AND ur.elder_position = 'coordenador'
      AND ur.congregation_id = _congregation_id
  ) INTO _is_coord;

  IF NOT _is_coord THEN
    RAISE EXCEPTION 'Apenas o coordenador do corpo de anciãos pode definir essa senha.';
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

-- Retorna a senha em texto puro se o caller for ancião cadastrado da congregação.
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
      AND ur.elder_position IN ('coordenador','secretario','sup_servico')
  ) INTO _is_elder;

  IF NOT _is_elder THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT elder_tab_password_plain INTO _plain
    FROM public.congregations WHERE id = _congregation_id;
  RETURN _plain;
END;
$$;

-- Retorna se o caller é o coordenador da congregação (para a UI mostrar editor x leitura).
CREATE OR REPLACE FUNCTION public.is_elder_coordinator(_congregation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'elder'
      AND ur.elder_position = 'coordenador'
      AND ur.congregation_id = _congregation_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_elder_tab_password(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_elder_coordinator(uuid) FROM PUBLIC, anon, authenticated;