-- Profiles: stop exposing emails of all congregation members.
DROP POLICY IF EXISTS "users see same congregation profiles" ON public.profiles;

-- Congregations.invite_code: revoke direct column read from clients.
REVOKE SELECT (invite_code) ON public.congregations FROM authenticated, anon;

-- Helper RPC: only the owning superintendent can read their congregations + invite codes.
CREATE OR REPLACE FUNCTION public.get_my_congregations()
RETURNS TABLE (id uuid, name text, invite_code text, superintendent_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.invite_code, c.superintendent_id, c.created_at
  FROM public.congregations c
  WHERE c.superintendent_id = auth.uid()
  ORDER BY c.name
$$;

REVOKE ALL ON FUNCTION public.get_my_congregations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_congregations() TO authenticated;