-- Add username column (nullable but unique when present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Unique case-insensitive username when set
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles ((lower(username)))
  WHERE username IS NOT NULL;

-- Unique case-insensitive circuit identifier when set (used for super login by circuit id)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_circuit_lower_unique
  ON public.profiles ((lower(circuit)))
  WHERE circuit IS NOT NULL;

-- Allow authenticated users to insert their own profile row (idempotent; safe if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'users insert own profile'
  ) THEN
    CREATE POLICY "users insert own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;