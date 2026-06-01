## Plano consolidado

Mantém todas as 4 correções já aprovadas (reordenar notas, mover em lote, sync APK, preservar event_date/period) e adiciona a 5.ª correção.

### 5. Cartões completos de transporte no “Resumo do Dia”
Hoje os cartões de transporte do Resumo do Dia mostram apenas motorista e telefone. Falta tudo o que está no card original da aba Transporte (tipo de evento, direção, horários, dia indicado, e o comportamento “Apoiar todos os eventos/horários” quando `all_day = true`).

Aplica-se aos três acessos que compartilham `VisitSummaryView.tsx`:
- Superintendente (`/_app.resumo-semana`)
- Corpo de Anciãos e ESC (painel do visitante)
- Esposa do Superintendente (painel visitante em wifeMode)

Mudanças:

a) Backend — incluir todos os campos relevantes no payload.
   - `src/lib/visit-summary.functions.ts`: estender o select da `transport_schedule` para `id,event_date,weekday,event_type,direction,all_day,departure_time,return_time,driver_name,contact_phone,description,notes`.
   - `src/lib/guest.functions.ts`: mesma extensão no `supabaseAdmin.from("transport_schedule").select(...)`.
   - Sem migração SQL, sem mudança de RLS — apenas leitura de colunas já existentes e já permitidas.

b) Tipos — atualizar a interface `transport` em `VisitSummaryView.tsx` (`Snap.transport`) para refletir os novos campos como opcionais/nullable.

c) UI — agrupar e renderizar como na aba Transporte original.
   - Helpers reutilizados localmente: `fmtTime`, `eventTypeLabel` (`transport.eventType.<key>`), `directionLabel` (`transport.direction.<key>`), `weekdayLabel` (segunda… domingo) — todos com `defaultValue` para não exigir novas chaves.
   - Agrupar `snap.transport` por `(event_date, event_type, all_day)` da mesma forma que `_app.transporte.tsx` agrupa, para que o motorista “apoia todos os eventos” apareça uma única vez com a lista de horários do dia.
   - Card de cada grupo exibe: data + dia da semana, tipo de evento + direção, horários (`departure_time → return_time` ou “Dia inteiro”), motorista, telefone, descrição e observações. Se `all_day` então um único bloco resume todos os horários do grupo do dia.
   - Aplicar a mesma renderização em DOIS pontos do arquivo: o card de hoje (`todayTransport`, ~linha 736) e a aba “Trans” do painel completo (~linha 561).

d) i18n — usar exclusivamente chaves já existentes (`transport.eventType.*`, `transport.direction.*`, `transport.allDay`, `guest.labels.driver`, `guest.today.transport`). Onde faltar, passar `defaultValue` em PT e adicionar a mesma chave em `pt/en/es.json` (ex.: `guest.transport.allDay` → "Dia inteiro" / "All day" / "Todo el día"; `guest.transport.driverSupportsAll` → "Apoia todos os eventos/horários" / "Supports all events/times" / "Apoya todos los eventos/horarios").

### Segurança e arquitetura
- Nenhuma nova tabela; RLS atual da `transport_schedule` já cobre os três perfis (super, anciãos, esposa) via policies existentes.
- Toda leitura permanece em `createServerFn`/`requireSupabaseAuth` e o painel visitante continua usando `supabaseAdmin` apenas dentro do server fn (`getGuestSnapshot`), nunca no cliente.
- Validação Zod inalterada (inputs já validados).
- Sem mudanças no fluxo offline ou no cache de snapshots (`snapshot-cache.ts` continua armazenando o payload novo intacto).

### Arquivos editados (somatório das 5 correções)
- `src/lib/personal-outlines.functions.ts`
- `src/lib/visit-summary.functions.ts`
- `src/lib/guest.functions.ts`
- `src/hooks/use-outlines-sync.ts`
- `src/routes/_app.tsx`
- `src/routes/_app.consideracoes-campo.tsx`
- `src/components/visit-summary/VisitSummaryView.tsx`
- `src/i18n/locales/{pt,en,es}.json`

Sem migrações SQL, sem alteração de RLS.