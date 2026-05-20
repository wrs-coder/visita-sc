## Plano de build consolidado — Visita SC

### 1) Arquivo de diretrizes
- Criar `instructions.md` na raiz com o conteúdo integral fornecido pelo utilizador (regras 1–5). Este passa a ser a referência de arquitetura para builds futuros.

### 2) Nova aba "Modelos de Reunião e Discurso"
Espelho exato da arquitetura da aba "Modelos de Reuniões de Campo" (`_app.modelo-reunioes-de-campo.tsx` + `field-meeting-templates.functions.ts`), com as adaptações de domínio:

- **Banco de dados** (migração SQL nova):
  - `meeting_talk_templates` (id, superintendent_id, congregation_id?, name, slot, created_at, updated_at).
  - `meeting_talk_template_midweek` (template_id, chairman, closing_prayer).
  - `meeting_talk_template_weekend_themes` (template_id, title, sort_order) — permite múltiplos temas (gera dropdown na visita).
  - `meeting_talk_template_pioneer` (template_id, weekday `0..6`, meeting_time, super_meeting_weekday, super_meeting_time, location, opening_prayer, closing_prayer) — apenas dia da semana + hora, **sem data fixa**.
  - `meeting_talk_template_elders` (template_id, opening_prayer, closing_prayer).
  - RLS: superintendente dono pode `ALL`; membros da congregação vinculada podem `SELECT` quando `congregation_id IS NOT NULL`.
  - Acrescentar coluna `meeting_talk_template_id uuid` em `visits` (FK lógica para o novo template) para a vinculação obrigatória no Itinerário.

- **Server functions** (`src/lib/meeting-talk-templates.functions.ts`):
  - `listMeetingTalkTemplates`, `getMeetingTalkTemplate`, `createMeetingTalkTemplate`, `updateMeetingTalkTemplate`, `deleteMeetingTalkTemplate`, **`duplicateMeetingTalkTemplate`** (regra: todos os modelos devem ter "duplicar"), `applyMeetingTalkTemplate(visitId, templateId)` — copia para `midweek_meetings`, `weekend_meetings` (cria 1 linha por tema, ou única + payload de opções), `pioneer_meetings` (resolve dia da semana → data dentro da visita), `elders_servants_meetings`.

- **Rota**: `src/routes/_app.modelo-reunioes-discursos.tsx` com sub-abas "Meio de Semana", "Fim de Semana" (lista editável de temas, add/remove), "Pioneiros" (dropdown de dia da semana 2ª–Dom + time picker, sem calendário), "Anciãos e Servos". Botões: Criar, Editar, **Duplicar**, Eliminar.

- **Aba "Modelos" (`_app.modelos.tsx`)**: adicionar card de entrada para o novo tipo, ao lado dos cards existentes.

### 3) Aba Itinerário — vinculação obrigatória
- No formulário de criar/editar visita em `_app.cronograma.tsx`:
  - Adicionar Select obrigatório **"Modelo de Reunião e Discurso"** (carrega de `listMeetingTalkTemplates`).
  - Tornar **obrigatórios** também `template_id` (programa), `checklist_template_id`, `field_meeting_template_id`. Remover qualquer rótulo "(opcional)".
  - Validar antes do submit; bloquear criação se algum modelo faltar; mensagem clara em PT-PT.
  - Garantir botão "Duplicar" em todos os tipos de modelos existentes (verificar `_app.modelos.tsx` e ajustar se faltar em algum).

### 4) Aba "Reuniões e Discursos" — botão Aplicar Modelo
- Em `src/routes/_app.reunioes-discursos.tsx` adicionar botão **"Aplicar Modelo"** (visível ao Superintendente) que chama `applyMeetingTalkTemplate(activeVisitId, visit.meeting_talk_template_id)`, com confirmação ("isto irá sobrescrever os campos atuais da semana"). Após aplicar: `queryClient.invalidateQueries()` para refrescar os painéis.
- Manter intactos: rascunho global em `localStorage` e botão "Salvar dados" no topo (já implementados).
- Painel "Fim de Semana": quando o modelo tem múltiplos temas, o campo `talk_theme_title` vira **dropdown** com as opções vindas do template (anciãos podem escolher).
- Painel "Pioneiros": ao aplicar, calcular `meeting_at` = data da visita correspondente ao weekday escolhido + hora.

### 5) RLS / Supabase
- Migração única que:
  - Cria as 5 novas tabelas + RLS (super = ALL via `superintendent_id = auth.uid()` + `has_role(... ,'superintendent')`; membros = SELECT via `congregation_id = private.get_user_congregation(auth.uid())`).
  - Reforça que o Superintendente pode `INSERT/UPDATE/SELECT/DELETE` em `talk_themes`, `meeting_templates` correlatas e nas novas tabelas — auditar políticas existentes em `talk_themes` (já OK) e nas tabelas filhas de `visits` (já cobrem `is_superintendent_of`).
  - Adiciona `visits.meeting_talk_template_id`.

### 6) Sem alterações fora do escopo
- Não tocar em Dashboard, Congregações, Auth, ou outras telas — já estão conformes às regras 1 e 5.

---

### Detalhes técnicos relevantes
- Server functions seguem o padrão existente: `createServerFn` + `requireSupabaseAuth`, copiar a estrutura de `field-meeting-templates.functions.ts`.
- `applyMeetingTalkTemplate` resolve weekday→data assim: itera `start_date..end_date` da visita e escolhe o primeiro dia cujo `getDay()` corresponda (ou todos os matches, caso haja múltiplos pioneiros).
- Migração escreve políticas usando `private.has_role` e `private.get_user_congregation` (já existem no schema).
- Tipos do Supabase regeneram automaticamente após a migração — não tocar em `src/integrations/supabase/types.ts`.

### Ordem de execução
1. Migração SQL (cria tabelas + RLS + coluna em `visits`) — aguardar aprovação.
2. Após aprovação: criar `instructions.md`, `meeting-talk-templates.functions.ts`, rota `_app.modelo-reunioes-discursos.tsx`, atualizar `_app.modelos.tsx`, `_app.cronograma.tsx`, `_app.reunioes-discursos.tsx` e painel de Fim de Semana / Pioneiros para suportar dropdown de temas e weekday.

Confirmas para eu seguir nesta ordem?