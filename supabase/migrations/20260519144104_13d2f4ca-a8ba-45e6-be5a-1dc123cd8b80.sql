
CREATE OR REPLACE FUNCTION private.get_user_congregation(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT c.id
  FROM public.profiles p
  JOIN public.congregations c ON c.id = p.congregation_id
  WHERE p.id = _user_id AND c.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.enforce_active_congregation_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF COALESCE(NEW.is_active, true) = true THEN
    SELECT COUNT(*) INTO active_count
    FROM public.congregations
    WHERE superintendent_id = NEW.superintendent_id
      AND is_active = true
      AND id <> NEW.id;
    IF active_count >= 20 THEN
      RAISE EXCEPTION 'Limite de 20 congregações ativas atingido. Inative uma para ativar outra.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_active_congregation_limit ON public.congregations;
CREATE TRIGGER trg_enforce_active_congregation_limit
BEFORE INSERT OR UPDATE OF is_active, superintendent_id ON public.congregations
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_congregation_limit();
