
# Plano — Programação de Anciãos

## Decisões confirmadas
- **Escopo do modelo do super:** igual a "Modelos de Programação Pessoal" — o super **pré-cria os eventos** em cada seção (com "Informações adicionais" e, na Seção 01, a lista de slots dia/horário). Ao aplicar, os eventos são copiados para a visita e os anciãos **preenchem os campos**.
- **Quem pode adicionar eventos na visita:**
  - **Seções 01, 02 e 04:** apenas o superintendente (via modelo). Anciãos NÃO veem botão "Adicionar"; apenas editam os campos dos eventos vindos do snapshot.
  - **Seção 03 (Recomendações):** anciãos PODEM adicionar eventos além dos criados pelo super (botão "Adicionar" visível).
- **Permissão dos anciãos:** segue `can_edit_visit` (coordenador, secretário, sup. serviço). Corpo é read-only.
- **Aplicação na visita:** copy-on-apply (snapshot). Mudanças posteriores no modelo não afetam visitas já aplicadas.
- **Tabela por seção** (não JSONB) — melhor para RLS, tipagem e snapshots offline.
- **Visibilidade para esposa do super:** ocultas, mesma lógica do Checklist — guard `!wifeMode` nas Tabs/Section + snapshot vazio em `guest.functions`.

## Banco de dados (1 migração)

### Modelos (super pré-cria os eventos)
- `elder_program_templates` — `id, superintendent_id, congregation_id (nullable=global), name`
- `elder_program_template_sections` — `template_id, section ('pastoral'|'encouragement'|'recommendations'|'local'), additional_info text` (1 linha por seção)
- `elder_program_template_slots` — `template_id, label text, sort_order` (Seção 01)
- `elder_program_template_events` — eventos pré-criados pelo super; modelo plano:
  - `id, template_id, section, sort_order`
  - **Pastoral:** `slot_label`
  - **Encouragement:** `category ('inactive'|'sick'|'special_privileges')`
  - **Recommendations:** `purpose ('ministerial_servant'|'elder'|'redesignation'|'removal'|'cca_change')`
  - **Local:** sem enum
  - Demais campos opcionais (super pode pré-preencher ou deixar para o ancião).

### Snapshot na visita
- `elder_pastoral_visits` — `visit_id, additional_info, slot_label, companion, family_name, address, family_members, spiritual_info, sort_order, source ('template'|'manual')`
- `elder_encouragements` — `visit_id, additional_info, category, person_name, address, contact, health_info (nullable), spiritual_info, sort_order, source`
- `elder_recommendations` — `visit_id, additional_info, purpose, full_name, family_members, field_group, info, sort_order, source`
- `elder_local_matters` — `visit_id, additional_info, suggested_by, subject, sources, info, sort_order, source`
- `elder_program_visit_slots` — `visit_id, label, sort_order`
- `visits.elder_program_template_id` (nova coluna)

Coluna `source` ajuda a UI distinguir e a permitir o super deletar manuais sem afetar snapshot.

### RLS
- Modelos: `super manages` + `members read linked`.
- Visita:
  - `members read`, `editors update`, `super deletes`: para as 4 tabelas.
  - **INSERT diferenciado:**
    - `elder_recommendations`: `editors insert` via `private.can_edit_visit` (anciãos podem criar).
    - Outras 3 tabelas: INSERT permitido apenas para o superintendente da congregação (via `private.is_superintendent_of`) — impede que ancião crie eventos fora do modelo, mantém edição livre.
- GRANTs para `authenticated` e `service_role`.

## Backend — server functions
`src/lib/elder-program-templates.functions.ts`:
- CRUD do modelo
- `saveElderProgramTemplate(templateId, { sections, pastoralSlots, events })`
- `applyElderProgramTemplateToVisit(visitId, templateId)`:
  1. upsert `additional_info` por seção
  2. substitui `elder_program_visit_slots`
  3. para cada `elder_program_template_event`, INSERIR na tabela da seção com `source='template'` (idempotente via `(visit_id, section, sort_order)`). Não toca em linhas com `source='manual'` nem em campos já editados.

`src/lib/elder-program.functions.ts`:
- `listElderProgramForVisit(visitId)` → seções + slots + arrays das 4 entidades
- `upsert*` / `delete*` para cada entidade (server enforça regra de INSERT: apenas `elder_recommendations` aceita criação por ancião com `source='manual'`).

## UI

### Super — `src/routes/_app.modelo-programacao-ancioes.tsx` (novo)
Espelha `_app.modelos.tsx`:
- 4 cards verticais (1 por seção):
  - `CharCounterTextarea` "Informações adicionais do superintendente" (auto-save)
  - Botão **"Adicionar evento"** → cria card-evento pré-criado pelo super.
  - Cards-evento com os campos da seção (super pode pré-preencher ou deixar em branco).
- Card extra Seção 01: input + `Plus` para slots; `Trash2` por item.
- Header: seletor de modelo, criar/duplicar/renomear/excluir, vínculo com congregação, `TemplateIOButtons`.
- Sidebar: novo item em "Modelos Base" (`src/routes/_app.tsx`).

### Vínculo na visita
- Diálogo de aplicação de modelos da visita ganha seletor "Programação de Anciãos" + botão Aplicar.

### Anciãos — nova aba "Pastoreios, Recomendações e outros" em `_app.reunioes-discursos.tsx`
- Inserida ACIMA de "Estudos e Revisitas".
- 4 cards verticais. Em cada:
  - `TemplateExtraBlock` read-only com `additional_info` (snapshot do super, vermelho).
  - Lista dos cards-evento do snapshot, totalmente editáveis pelos anciãos.
  - **Botão "Adicionar"**: visível APENAS na Seção 03 (Recomendações). Nas Seções 01, 02 e 04 não aparece.
  - Cards "manuais" (Seção 03) ganham badge discreta "Adicionado pelos anciãos" e podem ser excluídos pelo autor / coordenador.
- **Seção 02:** "Problemas de Saúde" só aparece quando `category === 'sick'`.
- **Seção 01:** `Select` populado por `elder_program_visit_slots`. Vazio → hint "Superintendente ainda não definiu slots".

### Visitante / Esposa — OCULTAÇÃO (padrão Checklist)
- `src/lib/guest.functions.ts`: se `wifeMode === true`, pular as queries e devolver vazios (`pastoral: []`, `encouragements: []`, `recommendations: []`, `localMatters: []`, `elderProgramSlots: []`, `elderProgramSections: {}`).
- `src/components/visit-summary/VisitSummaryView.tsx` + `src/routes/visitante.painel.tsx`:
  - Aba "Pastoreios, Recomendações e outros" só renderiza se `!snap.wifeMode`.
  - Section/agregador "Selecionado" iteram as 4 listas apenas se `!snap.wifeMode`.

## i18n
- `pt.json`, `en.json`, `es.json`:
  - `elderProgram.tabTitle`, `elderProgram.sections.{pastoral,encouragement,recommendations,local}.title`
  - Labels dos campos + opções dos selects (categoria e finalidade)
  - `elderProgram.addEvent`, `elderProgram.slotsEmptyHint`, `elderProgram.manualBadge`

## Não-alvos
- Não altera estrutura/RLS dos outros modelos.
- Offline-prefetch: apenas listar as novas tabelas.

## Riscos & mitigações
- **Schema novo amplo:** uma migração com GRANTs + RLS por tabela, copiando 1:1 o padrão de `elders_servants_meetings`/`program_template_items`.
- **Re-aplicar modelo sem duplicar:** `applyElderProgramTemplateToVisit` idempotente via `(visit_id, section, sort_order, source='template')`. Manuais e edições preservados.
- **Ancião criar evento fora do permitido:** bloqueado por RLS (INSERT só liberado na `elder_recommendations`) + UI esconde o botão nas demais seções.
- **Vazamento entre congregações:** RLS via `can_edit_visit` + `is_superintendent_of`.
- **Vazamento para esposa:** dupla camada — `guest.functions` (sem dados no payload) + guard `!wifeMode` na UI, idêntico ao Checklist.

Aprovação para implementação.
