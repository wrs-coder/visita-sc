DROP TRIGGER IF EXISTS tg_active_cong_limit ON public.congregations;
DROP TRIGGER IF EXISTS trg_enforce_active_congregation_limit ON public.congregations;
DROP TRIGGER IF EXISTS enforce_active_congregation_limit_trg ON public.congregations;

DROP FUNCTION IF EXISTS private.enforce_active_congregation_limit();

CREATE OR REPLACE FUNCTION public.enforce_active_congregation_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  active_total integer;
BEGIN
  IF NEW.is_active IS TRUE THEN
    SELECT COUNT(*) INTO active_total
    FROM public.congregations
    WHERE superintendent_id = NEW.superintendent_id
      AND is_active = TRUE
      AND id <> NEW.id;

    IF active_total >= 30 THEN
      RAISE EXCEPTION 'Limite de 30 congregações ativas atingido para este superintendente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_active_congregation_limit_trg
BEFORE INSERT OR UPDATE OF is_active, superintendent_id
ON public.congregations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_congregation_limit();