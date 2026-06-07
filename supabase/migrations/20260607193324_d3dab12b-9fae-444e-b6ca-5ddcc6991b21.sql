-- Wave 2 / alerta 5: tirar `elder_tab_password_plain` da Data API.
-- A coluna continua existindo no banco e segue sendo lida pelo service_role
-- (server functions `listMyElders` e `getElderTabPasswordForElder`), mas
-- nenhum cliente autenticado/anonimo consegue mais selecioná-la via PostgREST,
-- mesmo que faça `select *` na tabela `congregations`.

REVOKE SELECT (elder_tab_password_plain) ON public.congregations FROM authenticated;
REVOKE SELECT (elder_tab_password_plain) ON public.congregations FROM anon;

-- Garante explicitamente o acesso do service_role (usado pelo supabaseAdmin
-- nas server functions que precisam ler/gravar o plaintext).
GRANT SELECT (elder_tab_password_plain), UPDATE (elder_tab_password_plain)
  ON public.congregations TO service_role;

-- Regrant das demais colunas para authenticated (column-level REVOKE faz o
-- Postgres exigir grants explícitos por coluna em SELECT). Listamos todas as
-- colunas, exceto `elder_tab_password_plain`, para não quebrar leituras existentes.
GRANT SELECT (
  id,
  superintendent_id,
  invite_code,
  name,
  is_active,
  created_at,
  elder_tab_password_hash,
  elder_tab_password_created_by,
  elder_tab_password_updated_at
) ON public.congregations TO authenticated;