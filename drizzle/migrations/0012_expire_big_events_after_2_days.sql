CREATE OR REPLACE FUNCTION public.delete_expired_circuit_events()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.circuit_schedule_events WHERE event_date < CURRENT_DATE;
  DELETE FROM public.circuit_big_event_parts WHERE event_id IN (
    SELECT id FROM public.circuit_big_events WHERE event_date IS NOT NULL AND event_date < CURRENT_DATE - 2
  );
  DELETE FROM public.circuit_big_events WHERE event_date IS NOT NULL AND event_date < CURRENT_DATE - 2;
$function$;