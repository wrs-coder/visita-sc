CREATE OR REPLACE FUNCTION public.gen_short_code(_len int DEFAULT 8)
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public, extensions AS $$
DECLARE
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  b bytea := extensions.gen_random_bytes(_len);
  out text := '';
  i int;
BEGIN
  FOR i IN 0.._len-1 LOOP
    out := out || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  END LOOP;
  RETURN out;
END $$;

ALTER TABLE public.circuit_big_events ADD COLUMN IF NOT EXISTS public_code text;
ALTER TABLE public.circuit_big_event_parts ADD COLUMN IF NOT EXISTS personal_code text;

UPDATE public.circuit_big_events SET public_code = public.gen_short_code(8) WHERE public_code IS NULL;
UPDATE public.circuit_big_event_parts SET personal_code = public.gen_short_code(8) WHERE personal_token IS NOT NULL AND personal_code IS NULL;

ALTER TABLE public.circuit_big_events ALTER COLUMN public_code SET DEFAULT public.gen_short_code(8);
CREATE UNIQUE INDEX IF NOT EXISTS circuit_big_events_public_code_key ON public.circuit_big_events(public_code);
CREATE UNIQUE INDEX IF NOT EXISTS circuit_big_event_parts_personal_code_key ON public.circuit_big_event_parts(personal_code);

-- O código curto pessoal acompanha o token pessoal: novo token = novo código; sem token = sem código.
CREATE OR REPLACE FUNCTION public.sync_personal_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.personal_token IS NULL THEN
    NEW.personal_code := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.personal_token IS DISTINCT FROM OLD.personal_token OR NEW.personal_code IS NULL THEN
    NEW.personal_code := public.gen_short_code(8);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_personal_code ON public.circuit_big_event_parts;
CREATE TRIGGER trg_sync_personal_code BEFORE INSERT OR UPDATE OF personal_token ON public.circuit_big_event_parts
FOR EACH ROW EXECUTE FUNCTION public.sync_personal_code();