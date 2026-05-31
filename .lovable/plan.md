
## Missão 1 — Acesso da esposa

### 1.1 Corrigir botão "Semana atual" (visitante/painel — modo esposa)

**Problema:** o botão hoje só faz `setWeekAnchor(null)` e recarrega com a mesma congregação. O servidor (`getGuestSnapshot`) sempre devolve a visita mais recente daquela congregação por `start_date desc`, então não muda nada visualmente se a visita atual já é a mais recente, e nunca troca de congregação.

**Correção:**
- Em `src/lib/guest.functions.ts`: aceitar um novo input opcional `pickCurrent: boolean`. Quando `true` e `wifeMode` com várias congregações, varrer as congregações disponíveis, encontrar a que tem visita ativa cobrindo `today` (`start_date <= today <= end_date`) e selecionar essa congregação + visita. Se nenhuma cobrir hoje, escolher a próxima futura mais próxima; se nada futuro, manter a mais recente.
- Em `src/routes/visitante.painel.tsx`: o botão "Semana atual" chama `load(code, null, { pickCurrent: true })`, e ao receber a resposta atualiza o `setSelectedCongregation(cong.id)` localmente para refletir a troca no seletor.

### 1.2 Nova aba "Comunicação do casal"

Formato confirmado: **recados com título + corpo + respostas encadeadas**, com card no Dashboard mostrando contador de não lidos + últimas mensagens.

**Banco (migration):**
- `couple_messages`: `id`, `superintendent_id` (uuid, indexado), `parent_id` (uuid, null = mensagem raiz; not null = resposta), `author` (text: `'super' | 'wife'`), `title` (text, só na raiz), `body` (text), `read_by_super` (bool), `read_by_wife` (bool), `created_at`, `updated_at`.
- GRANTs: `authenticated` (SELECT/INSERT/UPDATE/DELETE), `service_role` ALL. Sem anon.
- RLS:
  - `super manages own couple messages`: `superintendent_id = auth.uid()` (ALL).
  - Esposa **não** tem login Supabase; o acesso dela acontece via `wife_invite_code` por server function com `supabaseAdmin`, igual ao painel atual. Não precisa de policy para a esposa — a server fn valida o código e usa admin client.
- Índices: `(superintendent_id, parent_id, created_at)`.

**Server functions (`src/lib/couple-messages.functions.ts`):**
- `listCoupleMessages` — superintendente autenticado (`requireSupabaseAuth`): retorna threads (raiz + respostas) ordenadas por `created_at desc`, incluindo contagem de não lidos para o super.
- `createCoupleMessage` — super autenticado: cria raiz (com `title`) ou resposta (`parent_id`), `author='super'`, marca `read_by_super=true`.
- `markCoupleMessagesRead` — super autenticado: marca todas as não lidas como `read_by_super=true`.
- `wifeListCoupleMessages({ inviteCode })` — usa `supabaseAdmin`, valida `wife_invite_code` em `profiles`, lista as mensagens daquele super.
- `wifeCreateCoupleMessage({ inviteCode, parentId?, title?, body })` — mesmo padrão; `author='wife'`, marca `read_by_wife=true`.
- `wifeMarkCoupleMessagesRead({ inviteCode })`.

**UI:**
- **Esposa** (`src/routes/visitante.painel.tsx`): nova `TabsTrigger` "Comunicação do casal" (ícone `MessageCircle`), só quando `wifeMode` e código é `wife_invite_code` (não código*). Lista de threads, botão "Novo recado" (título + corpo), botão "Responder" em cada thread. Polling leve a cada 30s e refetch ao trocar de aba — sem realtime para manter leve.
- **Superintendente**:
  - Dashboard (`src/routes/_app.dashboard.tsx`): novo card "Recados da esposa" com badge de não lidos + pré-via das 3 últimas mensagens, link "Abrir" leva a `/comunicacao-casal`.
  - Resumo da semana (`src/routes/_app.resumo-semana.tsx`): seção compacta com não lidos + últimos 3 recados da semana.
  - Nova rota `src/routes/_app.comunicacao-casal.tsx`: thread view completa com responder/criar/marcar como lido. Adicionar entrada no menu lateral (mesmo local onde estão outras abas do super).
- i18n nas 3 línguas (`pt`, `en`, `es`): chaves em `couple.*`.

## Missão 2 — Eventos de hoje no Dashboard do super

Em `src/routes/_app.dashboard.tsx`, adicionar um novo card "Hoje no cronograma" próximo ao topo (depois do card de visita ativa). Busca:
- `circuit_schedule_events` da congregação ativa onde `event_date = today` (excluindo `scope='wife'` automaticamente pela RLS já existente).
- `schedule_events` da visita ativa onde `event_date = today` e `is_active = true`.
Mostra horário + título + local. Se vazio: "Nenhum evento para hoje". Link "Ver cronograma" → `/cronograma`.

## Missão 3 — Bloco "Dia vigente" no Cronograma

Em `src/routes/_app.cronograma.tsx`, entre o navegador de semanas (linha ~378-393) e a grade de segunda a domingo (renderiza `days` a partir de `weekStart`), adicionar:

- Bloco fixo destacado (card com borda primária) mostrando **hoje** + eventos do dia. Sempre visível (independente da semana navegada).
- Quando a semana navegada inclui hoje, **ocultar** o dia duplicado na grade (filtrar `today` de `days` no map). Quando a semana navegada não inclui hoje, a grade segue intacta (sem alteração).
- Reutiliza o mesmo componente/renderização de "dia" já usado na grade — só envolve em um container com destaque visual e label "Hoje · {data}".

## Detalhes técnicos / arquivos tocados

```text
supabase/migrations/<ts>_couple_messages.sql   (novo)
src/lib/couple-messages.functions.ts            (novo)
src/lib/guest.functions.ts                      (input pickCurrent + lógica)
src/lib/guest-session.ts                        (sem mudança — anchor não usado)
src/routes/visitante.painel.tsx                 (botão semana atual + aba esposa)
src/routes/_app.dashboard.tsx                   (card hoje + card recados)
src/routes/_app.resumo-semana.tsx               (bloco recados)
src/routes/_app.comunicacao-casal.tsx           (novo — rota do super)
src/routes/_app.cronograma.tsx                  (bloco dia vigente + ocultar duplicado)
src/routes/_app.tsx                             (menu lateral: nova entrada)
src/i18n/locales/{pt,en,es}.json                (chaves couple.*, dashboard.today, schedule.todayBlock)
```

**Performance / fluidez:** sem realtime; polling de 30s só quando a aba/card está montado. Querys filtradas por `superintendent_id` e indexadas. Dashboard usa `useQuery` com `staleTime` curto. Nenhuma mudança em tabelas existentes além da nova `couple_messages`.

## Verificação após implementar

- Esposa: clicar "Semana atual" troca para a congregação com visita cobrindo hoje.
- Esposa cria recado → super vê badge no Dashboard e no Resumo, abre `/comunicacao-casal`, responde → esposa recebe resposta no próximo poll.
- Dashboard mostra eventos de hoje (cronograma + cronograma da visita).
- Cronograma: bloco "Hoje" aparece fixo; quando hoje está na semana exibida, não duplica.
- Ancião visitante (código*) e ESC continuam **sem** ver eventos `scope='wife'` nem a aba de comunicação.
