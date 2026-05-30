ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wife_invite_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wife_invite_code_unique
  ON public.profiles (wife_invite_code)
  WHERE wife_invite_code IS NOT NULL;