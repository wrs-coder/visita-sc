# Plano de implementação — 6 missões

Ordem aprovada. Cada fase é entregue e validada antes da próxima.

## Fase A — Missões 1, 2, 4 (sem migration)

### M1 — Gerenciar bíblias só para Superintendente
- `src/routes/_app.perfil.tsx`: envolver `BibleManagerDialog` (e seu botão de abertura) em `{role === "superintendent" && (...)}`.

### M2 — Bug do card duplicado após login/cadastro
- `src/hooks/use-auth.tsx`: no handler de `SIGNED_IN`, setar `loading=true` antes de `loadUserData` e `loading=false` no `finally`, garantindo que `needsOnboarding`/`role`/`congregation` sejam lidos já estabilizados.
- `src/routes/index.tsx`: aguardar `loading===false` (já faz) — confirmar que `needsOnboarding` é recomputado após `loadUserData`.
- `src/routes/onboarding.tsx`: no topo do componente, se `role` válido + `congregation` existe (anciao) ou `role==='superintendent'`, fazer `<Navigate to="/dashboard"/>` imediato para evitar reexibição do card.

### M4 — Observações visíveis para anciãos
- `src/routes/_app.reunioes-discursos.tsx`: em modo leitura, sempre renderizar o texto das observações (`<p>` ou `<RichContent>`). Esconder apenas o `<Textarea>` de edição quando o usuário não tem permissão de escrita. Sem mudança de schema/RLS.

**Validação Fase A:** `bun run test`, abrir `/perfil` como ancião e como superintendente, simular login novo.

---

## Fase B — Migration única consolidada

```sql
-- 1) visits.last_applied_at
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS last_applied_at TIMESTAMPTZ;

-- 2) transport_schedule: novas colunas (todas nullable / com default)
ALTER TABLE public.transport_schedule
  ADD COLUMN IF NOT EXISTS weekday        SMALLINT,
  ADD COLUMN IF NOT EXISTS event_type     TEXT,
  ADD COLUMN IF NOT EXISTS direction      TEXT,
  ADD COLUMN IF NOT EXISTS all_day        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS departure_time TIME,
  ADD COLUMN IF NOT EXISTS return_time    TIME;

-- 2b) Backfill weekday a partir de event_date existente
UPDATE public.transport_schedule
   SET weekday = EXTRACT(DOW FROM event_date)::smallint
 WHERE event_date IS NOT NULL AND weekday IS NULL;

-- 3) Tabela personal_outlines (esboços na nuvem)
CREATE TABLE public.personal_outlines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_path  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_outlines TO authenticated;
GRANT ALL ON public.personal_outlines TO service_role;

ALTER TABLE public.personal_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own outlines"   ON public.personal_outlines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own outlines" ON public.personal_outlines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own outlines" ON public.personal_outlines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own outlines" ON public.personal_outlines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_personal_outlines_updated
  BEFORE UPDATE ON public.personal_outlines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Limite de 10 esboços por usuário
CREATE OR REPLACE FUNCTION public.enforce_personal_outlines_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.personal_outlines WHERE user_id = NEW.user_id;
  IF total >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 esboços na nuvem atingido.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_personal_outlines_limit
  BEFORE INSERT ON public.personal_outlines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_personal_outlines_limit();
```

Dados existentes preservados (apenas ADD COLUMN + UPDATE não-destrutivo).

---

## Fase C — Missão 3 (merge não-destrutivo de modelos)

- `src/lib/templates.functions.ts`: refatorar `applyTemplateToVisit` (e funções irmãs de field/meeting/checklist) para:
  1. SELECT do registro existente da visita.
  2. Apenas preencher campos `NULL`/vazio com valores do modelo (`COALESCE` no JS).
  3. UPDATE `visits.last_applied_at = now()`.
- UI: em `_app.dashboard.tsx` e abas de formulário (reunioes-de-campo, reunioes-discursos), exibir `<Alert>` informativo quando `last_applied_at > now() - 7 days` e usuário for ancião: "Modelo aplicado recentemente — campos vazios foram preenchidos."
- i18n: chaves `templates.recentlyApplied`, `templates.mergeNotice` em pt/en/es.

---

## Fase D — Missão 5 (esboços na nuvem)

- `src/lib/personal-outlines.functions.ts` (novo):
  - `listCloudOutlines` (auth middleware, lista do próprio user)
  - `pushOutlineToCloud` (Zod: title 1..200, content_json, folder_path; usa `supabaseAdmin` com `user_id=context.userId`)
  - `pullOutlineFromCloud` (busca por id, valida ownership)
  - `deleteCloudOutline`
- `src/routes/_app.consideracoes-campo.tsx`: botões "Salvar na nuvem" / "Baixar da nuvem" por esboço + listagem dos cloud outlines, contador "X/10".
- `src/lib/bible-notes-store.ts`: helper para merge entre cloud e local sem quebrar IndexedDB.
- i18n: ~10 chaves novas em pt/en/es (`personalOutlines.cloud.*`).
- Preserva fluxo offline atual; sync é opt-in por esboço.

---

## Fase E — Missão 6 (transportes reestruturados)

- `src/lib/transport.functions.ts` (novo):
  - `upsertTransportSlot` (Zod completo: weekday 0..6, event_type enum, direction enum, times, driver 1..120, phone, all_day, notes)
  - `deleteTransportSlot`
  - `applyAllDayDriver` (quando `all_day=true`, replica driver/phone para demais slots do mesmo `event_date`/`weekday`)
- `src/routes/_app.transporte.tsx`: reescrever formulário em ordem fixa: **Dia da semana → Tipo de evento → Direção → Horários (saída/retorno) → Motorista → Telefone → checkbox "Dia inteiro"**.
- Remover todos os `supabase.from('transport_schedule').insert/update/delete` do cliente — substituir por `useServerFn`.
- i18n: chaves `transport.weekday`, `transport.eventType.*`, `transport.direction.*`, `transport.allDay`, `transport.applyAllDay` em pt/en/es.

---

## Regras globais aplicadas

- Todas as escritas das Missões 5 e 6 via `createServerFn` + `supabaseAdmin` (cliente nunca chama `.insert/.update/.delete` direto).
- Validação Zod com min/max em todos os inputs de servidor.
- RLS escopada por `user_id` / visit em todas as novas tabelas/colunas.
- Toda nova chave i18n em pt + en + es.
- Persistência offline e arquitetura de estado existentes preservadas.

Aprovado para implementar?
