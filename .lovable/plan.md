## Objetivo

Três ajustes coordenados envolvendo modelos e visualização para anciãos, com migração de banco preservando dados existentes, RLS revisada e i18n completo (pt/en/es).

1. **Modelos de reunião de campo** → novo campo "Observações" por modalidade (azul, opcional, apenas superintendente edita; anciãos veem em leitura).
2. **Reuniões e Discursos** → exibir, em **vermelho** e somente leitura, observações e cânticos dos modelos vinculados. Observações da reunião com os anciãos ocultas para a esposa (`wifeMode`).
3. **Modelo de Refeições** → novo campo "Observações gerais" (até 4000 caracteres, vermelho, apenas superintendente edita) exibido como leitura para anciãos acima do primeiro dia.

---

## Garantias transversais

- **Não destrutivo**: a migration apenas adiciona colunas `NULL` (sem `DEFAULT` que sobrescreva linhas). Nenhum `UPDATE` em massa. Todos os dados já preenchidos pela congregação permanecem intactos.
- **Segurança/RLS**: as novas colunas herdam as policies existentes das tabelas (`field_meeting_templates` e `program_templates` → só o superintendente dono escreve; anciãos da congregação leem via `members read linked …`). Validação adicional no client (`role === "superintendent"` para edição) e validação no servidor via `superintendent_id = auth.uid()` que já existe.
- **Limites de tamanho** validados no servidor com Zod (`general_observations ≤ 4000`, `observations ≤ 4000`) para evitar abuso.
- **Fluidez**: leitura dos novos campos reaproveita as queries já feitas para o modelo vinculado à visita (sem requests adicionais). Renderização condicional simples (sem novos efeitos pesados).
- **i18n**: todas as novas strings em `pt`, `en` e `es`.
- **Sem breaking changes**: campos opcionais (`null` permitido), readers tolerantes a `undefined`.

---

## 1. Observações por modalidade (Modelos de Reunião de Campo)

**Banco (migration):**
```sql
ALTER TABLE public.field_meeting_templates
  ADD COLUMN IF NOT EXISTS observations text;
```
RLS atual já cobre (super gerencia, anciãos da congregação leem). Nada a alterar em policies/GRANTs.

**UI (`src/routes/_app.modelo-reunioes-de-campo.tsx`):**
- `<Textarea>` opcional "Observações" no editor de cada modelo, `maxLength={4000}`.
- `readOnly` quando `role !== "superintendent"`.
- Texto em azul (`text-blue-600 dark:text-blue-400`) em edição e leitura.
- Persistido junto com o save existente; sem sobrescrever outras colunas.

**Server fn (`src/lib/field-meeting-templates.functions.ts`):**
- Aceitar `observations: z.string().max(4000).nullable().optional()` no upsert.
- Update parcial: passar apenas as chaves enviadas (não sobrescrever colunas omitidas).

---

## 2. Observações e cânticos visíveis em "Reuniões e Discursos"

Campos já existem em `meeting_talk_template_midweek.observations`, `weekend_observations`, `weekend_opening_song`, `weekend_closing_song`, `meeting_talk_template_pioneer.observations`, `meeting_talk_template_elders.observations` e — após item 1 — `field_meeting_templates.observations`.

**UI (`src/routes/_app.reunioes-discursos.tsx` + painéis em `src/components/meetings/*`):**
- Carregar modelo vinculado via `visits.meeting_talk_template_id` e `visits.field_meeting_template_id`.
- Em cada painel exibir bloco "Do modelo" (somente leitura), em **vermelho** (`text-red-600 dark:text-red-400`):
  - Midweek: `observations`
  - Weekend: `weekend_opening_song`, `weekend_closing_song`, `weekend_observations`
  - Pioneer: `observations`
  - Elders: `observations` (ocultar quando `wifeMode`)
  - Field (por dia/modalidade): `observations`
- Nenhuma edição inline; edição continua apenas em "Modelos".

**Visitante (`src/routes/visitante.painel.tsx`):**
- Mesmo bloco vermelho. `snap.wifeMode === true` oculta o bloco de observações da reunião com os anciãos.
- Atualizar `src/lib/guest.functions.ts` para incluir as colunas `observations`/`weekend_*` no select dos modelos.

---

## 3. Observações gerais de refeições (Modelo)

**Banco (migration):**
```sql
ALTER TABLE public.program_templates
  ADD COLUMN IF NOT EXISTS general_observations text;
```
RLS atual já cobre. Sem GRANT/POLICY adicional.

**UI Modelos (`src/routes/_app.modelos.tsx`, aba Refeições):**
- Acima da grade de dias: `<Textarea maxLength={4000}>` "Observações gerais", vermelho. `readOnly` para não-superintendente.
- Persistido no upsert existente (`fnUpsert`) sem tocar `meal_day_notes`.

**UI Refeições da visita (`src/routes/_app.refeicoes.tsx` + visitante):**
- Carregar `general_observations` do `program_templates` vinculado à visita (`visits.template_id`).
- Bloco de leitura vermelho acima do primeiro dia, visível a todos os papéis (anciãos e esposa).

**Server fn (`src/lib/templates.functions.ts`):**
- Aceitar `general_observations: z.string().max(4000).nullable().optional()`.
- Update parcial preservando colunas omitidas.

---

## Migração consolidada

```sql
ALTER TABLE public.field_meeting_templates
  ADD COLUMN IF NOT EXISTS observations text;

ALTER TABLE public.program_templates
  ADD COLUMN IF NOT EXISTS general_observations text;
```
- Não há `DEFAULT` → linhas existentes ficam com `NULL`.
- Nenhum dado preexistente é alterado.
- Policies/GRANTs herdam dos existentes — nenhuma brecha nova.

---

## i18n (pt/en/es)

Novas chaves em `src/i18n/locales/{pt,en,es}.json`:
- `templates.field.observations` / `observationsPlaceholder` / `observationsHint`
- `templates.meals.generalObservations` / `generalObservationsPlaceholder`
- `meetings.fromTemplate.title` (rótulo "Do modelo" / "From template" / "Del modelo")
- `meetings.fromTemplate.songs.opening` / `closing`
- `meetings.fromTemplate.observations`

---

## Arquivos previstos

- `supabase/migrations/<timestamp>_add_template_observations.sql` (novo)
- `src/routes/_app.modelo-reunioes-de-campo.tsx`
- `src/routes/_app.modelos.tsx`
- `src/routes/_app.refeicoes.tsx`
- `src/routes/_app.reunioes-discursos.tsx`
- `src/components/meetings/*` (painéis Midweek, Weekend, Pioneer, Elders, Field)
- `src/routes/visitante.painel.tsx`
- `src/lib/field-meeting-templates.functions.ts`
- `src/lib/templates.functions.ts`
- `src/lib/guest.functions.ts`
- `src/i18n/locales/{pt,en,es}.json`

---

## Verificação pós-implementação

- Build TypeScript limpo (tipos do Supabase regenerados após migration).
- Conferir no preview: super edita azul/vermelho; ancião vê leitura; visitante (esposa) não vê observações de anciãos.
- Editar um modelo existente e confirmar que campos preenchidos previamente não foram alterados.
