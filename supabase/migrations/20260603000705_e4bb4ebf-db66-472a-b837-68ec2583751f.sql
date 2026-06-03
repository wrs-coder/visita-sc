-- Senha opcional para proteger a aba "Anciãos" no acesso de visitantes
-- (corpo de anciãos / ESC). Hash usando pgcrypto (bcrypt).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.congregations
  ADD COLUMN IF NOT EXISTS elder_tab_password_hash text;

-- Função para o superintendente definir/limpar a senha.
-- Passar NULL ou string vazia remove a senha (aba volta a ser livre).
CREATE OR REPLACE FUNCTION public.set_elder_tab_password(
  _congregation_id uuid,
  _new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _super uuid;
BEGIN
  SELECT superintendent_id INTO _super
  FROM public.congregations
  WHERE id = _congregation_id;

  IF _super IS NULL THEN
    RAISE EXCEPTION 'Congregação não encontrada.';
  END IF;

  IF _super <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF _new_password IS NULL OR length(trim(_new_password)) = 0 THEN
    UPDATE public.congregations
      SET elder_tab_password_hash = NULL
      WHERE id = _congregation_id;
  ELSE
    UPDATE public.congregations
      SET elder_tab_password_hash = crypt(_new_password, gen_salt('bf'))
      WHERE id = _congregation_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text) TO authenticated;

-- Função pública (chamada pelo acesso de visitante) que verifica a senha.
-- Retorna true se a senha bate OU se não há senha definida.
CREATE OR REPLACE FUNCTION public.verify_elder_tab_password(
  _congregation_id uuid,
  _password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
BEGIN
  SELECT elder_tab_password_hash INTO _hash
  FROM public.congregations
  WHERE id = _congregation_id;

  IF _hash IS NULL THEN
    RETURN true;
  END IF;

  IF _password IS NULL OR length(_password) = 0 THEN
    RETURN false;
  END IF;

  RETURN crypt(_password, _hash) = _hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_elder_tab_password(uuid, text) TO anon, authenticated;

-- Função pública para apenas saber se há senha definida (sem expor o hash).
CREATE OR REPLACE FUNCTION public.elder_tab_password_is_set(
  _congregation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT elder_tab_password_hash IS NOT NULL
  FROM public.congregations
  WHERE id = _congregation_id;
$$;

GRANT EXECUTE ON FUNCTION public.elder_tab_password_is_set(uuid) TO anon, authenticated;