Tenho três frentes para aplicar. Antes de mexer, quero alinhar o escopo porque #2 e #3 são refatorações grandes que tocam quase todas as telas de leitura/escrita — quero ter sua aprovação antes de mexer no app inteiro.

## 1. Padronização dos modelos (entrega completa nesta rodada)

Espelhar a lógica do "Modelo de Programação" nos modelos de Checklist e Reuniões de Campo.

**Migração no banco:**
- Adicionar `checklist_template_id` e `field_meeting_template_id` em `visits` (FK opcional aos respectivos templates).
- Manter as colunas `congregation_id` em `checklist_templates` / `field_meeting_templates` por compatibilidade, mas o app deixa de usá-las (modelos viram "globais" do superintendente, como Programação).

**Server functions:**
- `applyChecklistTemplateForVisit({ visitId, templateId })` (nova) — semeia `checklist_items` a partir do template escolhido.
- `applyFieldMeetingTemplateForVisit({ visitId, templateId })` — passa a aceitar `templateId` explícito em vez de procurar pela congregação.
- Remover/ocultar `linkChecklistTemplate` e `linkFieldMeetingTemplate` da UI (mantemos no servidor por compat).

**UI:**
- `_app.checklist-modelos.tsx`: remove o `Select` "Vincular à congregação" e seu texto explicativo. Lista deixa de mostrar "→ Congregação".
- `_app.modelo-reunioes-de-campo.tsx`: idem.
- `_app.configuracoes.tsx` (Itinerário, onde a visita é criada/editada): além do "Modelo de programação", adiciona dois novos dropdowns:
  - "Modelo de Checklist aplicável"
  - "Modelo de Reunião de Campo aplicável"
  Os três modelos escolhidos são injetados via as três `applyXForVisit` na criação/edição da visita.

## 2. Cache local — proposta

A infraestrutura **já está** em pé: TanStack Query com `staleTime: 12h`, `gcTime: 24h`, `networkMode: "offlineFirst"`, persister em IndexedDB. O problema é que **a maioria das telas não usa Query** — fazem `useEffect` + `supabase.from(...).select()` cru e, pior, abrem um `channel` realtime por tela, que dispara `load()` em qualquer mudança.

Para realmente reduzir requisições, precisaríamos migrar ~10 telas (`checklist`, `escala`, `refeicoes`, `transporte`, `cronograma`, `notas`, `reunioes-discursos` etc.) para `useQuery` com `queryKey` por `visit_id`, e remover as subscrições realtime (substituindo por refetch sob demanda + pull-to-refresh).

**Pergunto:** topa que eu faça essa migração agora em todas as telas de leitura, ou prefere que eu faça primeiro só as 3 mais pesadas (checklist, escala, reunioes-discursos) para validar o padrão antes de propagar?

## 3. Agrupamento de escrita — proposta

Hoje a maioria dos campos já salva **on blur** (sai do input → salva), não a cada tecla. O que ainda salva por keystroke são alguns `Textarea` em `MeetingPanels` (orações, observações).

Plano:
- Criar `useDebouncedSave(value, save, { delay: 800 })` em `src/hooks/`.
- Aplicar nos `Textarea` de `SingleRowPanel`/`MeetingPanels` (orações, notas privadas, notas por dia de refeição).
- Garantir flush imediato no `beforeunload` e ao trocar de aba/visita (sem perder dado).

## Próximo passo

Vou aplicar a **Frente 1 inteira** agora (migração + servidor + UI). Para as Frentes 2 e 3, me confirme se prefere:

(a) **Tudo de uma vez** — migro todas as telas para Query + aplico debounce em todos os textareas. Mexe em muitos arquivos numa única rodada.

(b) **Faseado** — começo pelas 3 telas mais pesadas (checklist, escala, reunioes-discursos) + debounce nos textareas das reuniões. Se passar bem, propago para o resto na próxima rodada.

Recomendo (b) pelo menor risco de regressão.