
# Pacote unificado: Cronograma 2.0 + i18n

## 1. Nova arquitetura de dados (uma única migration)

A tabela atual `schedule_events` está atrelada a `visit_id` (uma visita = uma congregação). Vamos desacoplar e criar uma nova fonte de verdade para eventos do superintendente, sem quebrar dados existentes.

**Nova tabela `circuit_schedule_events`** (separada, não toca `schedule_events`):

Campos de domínio:
- `superintendent_id` (uuid, dono — sempre `auth.uid()`)
- `event_date` (date), `start_time` (time, null), `end_time` (time, null)
- `event_type` (text) — `ca_br`, `ca_co`, `pioneer_week`, `free_week`, `pioneer_special_meeting`, `regional_convention`, `pioneer_school`, `shepherding`, `other`
- `title` (text), `location` (text, null), `notes` (text, null)
- `companion` (text, null) — "Acompanhante" opcional
- `scope` (text) — `congregation` | `multi` | `all` | `personal`
- `congregation_ids` (uuid[]) — vazio para `personal`/`all`; uma ou várias para os outros
- `visible_to_spouse` (boolean, default true) — quando `false`, oculta no painel "Acesso Corpo de anciãos e ESC"
- `status` (text, default `pending`) — `pending` | `postponed` (concluir = DELETE permanente)

Índices: `(superintendent_id, event_date)`, GIN em `congregation_ids`.

**RLS (cobrindo o erro de violação de policy):**
- `super manages own circuit events` → ALL para o dono (`superintendent_id = auth.uid()` + `has_role(auth.uid(),'superintendent')`).
- `members read events for their congregation` → SELECT quando `private.get_user_congregation(auth.uid()) = ANY(congregation_ids)` OU `scope = 'all'` e o usuário pertence a alguma congregação do superintendente dono. Excluir `scope = 'personal'` para qualquer não-dono. Excluir quando `visible_to_spouse = false` e o usuário não for o próprio super.

**Auto-expiração D+1:** função SQL `delete_expired_circuit_events()` + job `pg_cron` diário às 03:00 BRT removendo `event_date < CURRENT_DATE`. Também aplicamos um filtro client-side `event_date >= today` como defesa em profundidade.

## 2. UI — `src/routes/_app.cronograma.tsx`

Reescrita focada (mantendo o visual atual de semana + cards):

- Carrega `circuit_schedule_events` do superintendente ativo + (para anciãos/ESC) eventos visíveis da sua congregação.
- Filtra `event_date >= hoje` no client.
- Botão "Novo evento" abre um dialog com os campos:
  - Tipo de compromisso (lista nova: CA-br, CA-co, Semana de pioneiro, Semana Livre, Reunião especial com os Pioneiros, Congresso Regional, Escola de Pioneiros, Pastoreio, outro)
  - Título, Data, Hora de início, Local, Notas
  - **Evento com**: Congregação individual / Várias congregações / Todas / Pessoal
  - Quando "individual" ou "várias": multiselect das congregações do superintendente
  - **Acompanhante** (texto livre, opcional)
  - **Visível para Esposa** (switch, default ligado)
- Cada card de evento ganha dois botões:
  - **Concluir** → DELETE permanente (com confirmação leve via toast)
  - **Adiar** → abre date picker; UPDATE em `event_date` sem criar novo registro; marca `status='postponed'`
- Mantém swipe semanal, navegação e seletor de calendário.

Realtime: assinatura em `circuit_schedule_events` filtrada por `superintendent_id`.

## 3. Visibilidade no painel da congregação (anciãos/ESC e esposa)

- A consulta dos anciãos/ESC usa as RLS acima (não vê `personal`, não vê o que tem `visible_to_spouse=false` se o leitor for a esposa). A identificação de "esposa" reaproveita o relacionamento existente em `user_roles` (perfil já registrado); na ausência desse marcador, o toggle simplesmente oculta para qualquer membro não-superintendente quando desligado (decisão segura por padrão).
- Painel "Acesso Corpo de anciãos e ESC" (`visitante.painel.tsx` aba Cronograma) recebe os eventos novos somando aos da visita, sem mexer no layout.

## 4. i18n (pt/en/es) simultâneo

Novo namespace `schedule` extendido em `pt.json`/`en.json`/`es.json`:
- Tipos: `eventTypes.ca_br`, `ca_co`, `pioneer_week`, `free_week`, `pioneer_special_meeting`, `regional_convention`, `pioneer_school`, `shepherding`, `other`
- Escopos: `scopes.congregation|multi|all|personal`
- Campos: `companion`, `visibleToSpouse`, `complete`, `postpone`, `postponeTo`, `completed`, `postponed`
- Toasts: `completedToast`, `postponedToast`, `requireScopeCongregations`

Mantém o contexto Testemunhas de Jeová (ex.: "Pastoreio", "Reunião especial com os Pioneiros", "Congresso Regional", "Semana de pioneiro").

## 5. Segurança e qualidade

- Toda escrita do super usa `superintendent_id = auth.uid()` no payload (evita "new row violates RLS").
- Validações client-side: escopo `congregation`/`multi` exige ≥ 1 congregação selecionada.
- Sem alterações em `visits` ou `schedule_events` legados — esta migração é aditiva, evitando regressão.
- Compatibilidade offline: usar `offlineInsert/Update/Delete` já existentes.

## 6. Ordem de execução

1. Migration SQL (nova tabela, RLS, função de limpeza, cron).
2. Locales pt/en/es com novas chaves.
3. Reescrever `_app.cronograma.tsx`.
4. Ajustar leitura no painel da esposa (`visitante.painel.tsx`, aba cronograma) para incluir os eventos da congregação ativa.
5. Smoke: criar evento de cada escopo, concluir, adiar, virar de semana, trocar idioma.

## Detalhes técnicos

```sql
CREATE TABLE public.circuit_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superintendent_id uuid NOT NULL,
  event_date date NOT NULL,
  start_time time, end_time time,
  event_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  location text, notes text, companion text,
  scope text NOT NULL CHECK (scope IN ('congregation','multi','all','personal')),
  congregation_ids uuid[] NOT NULL DEFAULT '{}',
  visible_to_spouse boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS conforme descrito. `pg_cron` agendado para deletar `event_date < CURRENT_DATE` diariamente.
