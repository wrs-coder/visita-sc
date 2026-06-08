## Objetivo

Dar ao Superintendente total liberdade para editar, dentro da "Semana da Visita", todos os campos hoje exibidos como "vindos do modelo" (somente leitura) — observações, cânticos, horários/dia das reuniões de Anciãos e Servos, dos Pioneiros, observações de campo, observações gerais do programa — além de permitir editar horários de partida/retorno de eventos de transporte já criados. Essas mudanças aplicam-se apenas à congregação ativa (visita selecionada) e nunca alteram os Modelos de Base nem a visualização/edição dos anciãos.

## Estratégia (per-visit override, sem tocar nos modelos)

Hoje `getVisitTemplateExtras` lê direto das tabelas `*_templates`. Para preservar a regra "edição não muda o modelo", criamos uma camada de **overrides por visita**. A leitura passa a ser: **override por visita → valor do modelo → null**. Os modelos permanecem intactos.

### 1. Migration: nova tabela `visit_template_overrides`
Uma linha por visita, com colunas espelhando exatamente os campos hoje em `VisitTemplateExtras`:

- `visit_id uuid PK references visits(id) on delete cascade`
- `field_observations text`
- `midweek_observations text`, `midweek_final_song text`
- `weekend_opening_song text`, `weekend_closing_song text`, `weekend_observations text`
- `pioneer_observations text`, `pioneer_weekday smallint`, `pioneer_meeting_time time`
- `elders_observations text`, `elders_weekday smallint`, `elders_meeting_time time`
- `program_general_observations text`
- `created_at`, `updated_at` + trigger `touch_updated_at`

GRANTs: `authenticated` (SELECT/INSERT/UPDATE/DELETE) e `service_role` (ALL). RLS:
- SELECT: superintendente da congregação da visita **ou** membro daquela congregação (mesma lógica do `getVisitTemplateExtras`, para que anciãos vejam o ajuste do superintendente).
- INSERT/UPDATE/DELETE: **somente o superintendente** da congregação da visita. Anciãos jamais escrevem aqui — preserva a regra "não afeta o modo dos anciãos".

### 2. Server functions (`src/lib/visit-template-extras.functions.ts`)
- Estender `getVisitTemplateExtras`: após ler o modelo, ler o override da visita e fazer merge campo-a-campo (override vence quando não-nulo). Retorno do `VisitTemplateExtras` permanece com o mesmo shape — nenhum componente que só lê precisa mudar.
- Nova `setVisitTemplateOverride` (POST, `requireSupabaseAuth`, validação Zod):
  - Input: `{ visitId, patch: Partial<OverrideRow> }` com whitelist estrita dos campos acima.
  - Verifica que `userId === congregation.superintendent_id`; caso contrário 403.
  - `upsert` em `visit_template_overrides` com `onConflict: visit_id`.

### 3. Componente editável (`src/components/meetings/TemplateExtraBlock.tsx`)
Adicionar `TemplateExtraEditable` reutilizável que recebe `{ label, templateValue, overrideValue, onSave, type: "text" | "textarea" }`. Comportamento:
- Quando `canEdit && isSuper`: renderiza `Input`/`Textarea` editável; placeholder = valor do modelo; salva no blur via `setVisitTemplateOverride`. Pequeno botão "↩ Restaurar do modelo" quando há override (envia `null`).
- Caso contrário: mantém o atual `TemplateExtraBlock` (vermelho/azul, somente leitura).

### 4. Painéis em `src/components/meetings/MeetingPanels.tsx`
Para cada painel (Midweek, Weekend, Pioneer, Elders) e para `FieldMeetingsPanel` / programa:
- Trocar os `TemplateExtraBlock` por `TemplateExtraEditable` ligados aos campos correspondentes do override.
- **Pioneer/Elders schedule**: hoje é texto somente leitura calculado de `weekday + meeting_time` do modelo. Substituir, quando `isSuper && canEdit`, por um `DayTimePicker` (já existente) que persiste `pioneer_weekday`/`pioneer_meeting_time` (ou `elders_*`) no override. A exibição read-only continua igual para os anciãos.
- Remover as mensagens "somente leitura" (`meetingsTalks.weekend.readOnlyNote` etc.) quando `isSuper === true` (regra 6 do `instructions.md`).

### 5. Observações por linha de "Reunião de Campo"
Em `FieldMeetingsPanel.tsx`, o bloco azul com `r.observations` (vindo do modelo no momento da criação da linha) passa a ser editável pelo super: trocar o `div` por `Textarea` controlada que chama o `update(r.id, { observations: v })` existente em `field_meetings`. Para anciãos: continua read-only.

### 6. Horários dos eventos de Transporte
Em `src/routes/_app.transporte.tsx`, no card de cada `r` (já dentro do `fieldset` `editAllowed`), trocar a linha "📅 fmtTime(departure) → fmtTime(return)" por dois `Input type="time"` (Partida / Retorno) que chamam `updateRow(r.id, { departure_time | return_time })` no blur. Visível somente para o super; anciãos continuam vendo o texto.

### 7. i18n (pt, en, es) — chaves simétricas
Adicionar:
- `meetingsTalks.fromTemplate.restoreFromTemplate` — "Restaurar do modelo" / "Restore from template" / "Restaurar del modelo"
- `meetingsTalks.fromTemplate.overrideHint` — pequena legenda "Editado para esta visita" / "Edited for this visit" / "Editado para esta visita"
- `transport.departureTime`, `transport.returnTime` (se faltarem)
- Remover usos remanescentes de `meetingsTalks.weekend.readOnlyNote` quando exibidos para super (apenas no render).

### 8. Checklist final (regra 11 do `instructions.md`)
1. Migration + GRANT + RLS por papel aplicados.
2. Zod no novo `setVisitTemplateOverride` com whitelist.
3. `VisitTemplateExtras` continua com o mesmo shape — snapshots (`visit-summary`, `guest`) seguem funcionando sem mudança; valores agora já chegam mesclados.
4. UI dos painéis, Reuniões de Campo e Transporte refletem override.
5. `isSuper` libera edição sem mensagem "somente leitura"; anciãos sem alteração visual.
6. pt/en/es completas e simétricas.
7. Invalidar `["visits","ensured", ...]` / queries de extras após save (`queryClient.invalidateQueries`).
8. Build limpo.

## Fora do escopo
- Nenhuma alteração nas tabelas `*_template*`, no editor de "Modelos de Base", no painel/visualização dos anciãos, nem nos fluxos de propagação modelo→visita já existentes.
- Sem alteração no backup `.zip` (a nova tabela é coberta pelo export server-side automaticamente ao ser adicionada ao mapa de tabelas exportadas — incluiremos `visit_template_overrides` em `backup.functions.ts`).
