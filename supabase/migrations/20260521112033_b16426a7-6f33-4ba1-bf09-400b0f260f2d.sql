-- Reafirma o modelo de segurança para as colunas substitute_name / substitute_phone
-- da tabela public.visits. As políticas existentes (super manages visits / members see visits)
-- já cobrem todas as colunas no nível de linha; este migration documenta e reforça a invariante.

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.visits.substitute_name IS
  'Nome do substituto do superintendente (apenas para visitas do tipo "Visita SCS"). RLS: escrita restrita ao superintendente da congregação; leitura para membros (anciãos) da mesma congregação.';

COMMENT ON COLUMN public.visits.substitute_phone IS
  'Telefone do substituto do superintendente (apenas para visitas do tipo "Visita SCS"). RLS: escrita restrita ao superintendente da congregação; leitura para membros (anciãos) da mesma congregação.';

-- Reafirma as políticas RLS de forma idempotente.
DO $$
BEGIN
  -- Leitura para membros da congregação (inclui anciãos).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visits' AND policyname = 'members see visits'
  ) THEN
    CREATE POLICY "members see visits"
      ON public.visits FOR SELECT
      USING (congregation_id = private.get_user_congregation(auth.uid()));
  END IF;

  -- CRUD completo para o superintendente da congregação.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visits' AND policyname = 'super manages visits'
  ) THEN
    CREATE POLICY "super manages visits"
      ON public.visits FOR ALL
      USING (private.is_superintendent_of(auth.uid(), congregation_id))
      WITH CHECK (private.is_superintendent_of(auth.uid(), congregation_id));
  END IF;
END $$;