-- 1) Revoga SELECT do hash da senha (paralelo ao que já fizemos com _plain).
REVOKE SELECT (elder_tab_password_hash) ON public.congregations FROM authenticated;
REVOKE SELECT (elder_tab_password_hash) ON public.congregations FROM anon;
GRANT SELECT (elder_tab_password_hash), UPDATE (elder_tab_password_hash) ON public.congregations TO service_role;

-- 2) Corrige policy quebrada de storage: usar o `name` do objeto, não `c.name`.
DROP POLICY IF EXISTS "members read visit backups" ON storage.objects;
CREATE POLICY "members read visit backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'visit-backups'
  AND (
    ((storage.foldername(name))[1])::uuid = private.get_user_congregation(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.congregations c
      WHERE c.id = ((storage.foldername(name))[1])::uuid
        AND c.superintendent_id = auth.uid()
    )
  )
);