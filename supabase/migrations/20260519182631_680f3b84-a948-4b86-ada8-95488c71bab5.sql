CREATE OR REPLACE FUNCTION public.enforce_active_congregation_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Limite removido: superintendentes podem ativar quantas congregações desejarem.
  RETURN NEW;
END;
$function$;