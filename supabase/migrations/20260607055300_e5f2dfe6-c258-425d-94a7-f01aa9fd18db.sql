-- 1. New columns on congregations
ALTER TABLE public.congregations
  ADD COLUMN IF NOT EXISTS elder_tab_password_created_by uuid,
  ADD COLUMN IF NOT EXISTS elder_tab_password_updated_at timestamptz;

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.elder_tab_password_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('set','update','remove')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.elder_tab_password_audit TO authenticated;
GRANT ALL ON public.elder_tab_password_audit TO service_role;

ALTER TABLE public.elder_tab_password_audit ENABLE ROW LEVEL SECURITY;

-- Superintendente da congregação OU ancião cadastrado pode ler o histórico
CREATE POLICY "members read elder tab password audit"
  ON public.elder_tab_password_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.congregations c
      WHERE c.id = elder_tab_password_audit.congregation_id
        AND c.superintendent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'elder'
        AND ur.congregation_id = elder_tab_password_audit.congregation_id
    )
  );

CREATE INDEX IF NOT EXISTS elder_tab_password_audit_cong_idx
  ON public.elder_tab_password_audit(congregation_id, created_at DESC);

-- 3. Replace RPC to log audit + track creator
CREATE OR REPLACE FUNCTION public.set_elder_tab_password(
  _congregation_id uuid,
  _new_password text,
  _actor_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _had_password boolean;
  _action text;
BEGIN
  SELECT elder_tab_password_hash IS NOT NULL INTO _had_password
    FROM public.congregations WHERE id = _congregation_id;

  IF _new_password IS NULL OR length(trim(_new_password)) = 0 THEN
    UPDATE public.congregations
      SET elder_tab_password_hash = NULL,
          elder_tab_password_plain = NULL,
          elder_tab_password_created_by = NULL,
          elder_tab_password_updated_at = now()
      WHERE id = _congregation_id;
    _action := 'remove';
  ELSE
    IF _had_password THEN
      UPDATE public.congregations
        SET elder_tab_password_hash = crypt(_new_password, gen_salt('bf')),
            elder_tab_password_plain = _new_password,
            elder_tab_password_updated_at = now()
        WHERE id = _congregation_id;
      _action := 'update';
    ELSE
      UPDATE public.congregations
        SET elder_tab_password_hash = crypt(_new_password, gen_salt('bf')),
            elder_tab_password_plain = _new_password,
            elder_tab_password_created_by = _actor_user_id,
            elder_tab_password_updated_at = now()
        WHERE id = _congregation_id;
      _action := 'set';
    END IF;
  END IF;

  IF _actor_user_id IS NOT NULL THEN
    INSERT INTO public.elder_tab_password_audit (congregation_id, actor_user_id, action)
    VALUES (_congregation_id, _actor_user_id, _action);
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_elder_tab_password(uuid, text, uuid) FROM anon, authenticated;