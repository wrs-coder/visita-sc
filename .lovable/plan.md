## Objetivo

Corrigir 4 lacunas entre os Modelos de Reunião e Discurso e a visualização das congregações, refletindo as mudanças no Resumo do Dia (dashboard) e nos acessos "Corpo de Anciãos/ESC" e "Esposa do Superintendente".

---

### Ajuste 01 — Cântico Final (Meio de Semana)

O `final_song` já é salvo em `meeting_talk_template_midweek`, mas não chega à congregação.

- `src/lib/visit-template-extras.functions.ts`
  - Estender o tipo `midweek` para incluir `final_song: string | null`.
  - No SELECT de `meeting_talk_template_midweek` adicionar `final_song`.
- `src/components/meetings/MeetingPanels.tsx` → `MidweekPanel`
  - Renderizar `<TemplateExtraBlock label={t("meetingsTalks.fromTemplate.finalSong")} value={extras.midweek?.final_song} />` no mesmo padrão dos cânticos de fim de semana (read-only, em vermelho).
- i18n (`pt/en/es.json`): adicionar `meetingsTalks.fromTemplate.finalSong`.

---

### Ajuste 02 — Pioneiro: remover campos "SC", manter dia/horário do superintendente

Hoje o template tem 4 campos (weekday/meeting_time + super_meeting_weekday/super_meeting_time) e o painel da congregação ainda mostra um seletor editável de data via `pioneer_meetings.meeting_at` / `super_meeting_at`.

**Backend**
- Migração SQL: `ALTER TABLE public.meeting_talk_template_pioneer DROP COLUMN super_meeting_weekday, DROP COLUMN super_meeting_time;` (mantém RLS e GRANTs existentes).
- `src/lib/meeting-talk-templates.functions.ts`
  - Remover os campos do Zod schema (`save`/`apply`/`exportTemplate`/`importTemplate`).
  - No `applyMeetingTalkTemplateToVisit`: gravar `pioneer_meetings.meeting_at = super_meeting_at = resolveDate(weekday, meeting_time)` (sem mais bifurcação).
  - No SELECT do `getTemplateById` retirar referências aos campos removidos.
- `src/lib/visit-template-extras.functions.ts`: estender `pioneer` para `{ observations, weekday: number|null, meeting_time: string|null, location, theme }` e ler esses campos.

**UI Templates** (`src/routes/_app.modelo-reunioes-discursos.tsx`)
- Remover labels/inputs "weekdayCO" e "timeCO" (super_meeting_*).
- Manter `weekday`/`meeting_time` com `readOnly={!isSuper}` (Select desabilitado quando não-super).
- Remover chaves i18n `templates.meetingTalk.pioneer.weekdayCO`, `.timeCO`, `.sameAsMain` em pt/en/es.

**UI Congregação** (`src/components/meetings/MeetingPanels.tsx` → `PioneerPanel`)
- Remover o `WeekdayTimePicker` editável e substituir por bloco read-only que exibe `"<dia da semana> — HH:MM"` derivado de `extras.pioneer.weekday` / `extras.pioneer.meeting_time`, na mesma formatação do template.
- Os demais campos (theme, location, prayers) permanecem editáveis para `canEdit`.

---

### Ajuste 03 — Anciãos e Servos: adicionar dia/horário (só super edita)

**Migração SQL**
```sql
ALTER TABLE public.meeting_talk_template_elders
  ADD COLUMN weekday smallint,
  ADD COLUMN meeting_time time;
```
(RLS/GRANTs já existentes cobrem; sem alterações.)

**Backend**
- `src/lib/meeting-talk-templates.functions.ts`: adicionar `weekday`/`meeting_time` ao schema Zod `elders`, ao upsert, ao `getTemplateById`, ao `apply`/`import`/`export`. Validação: `weekday: z.number().int().min(0).max(6).nullable()`, `meeting_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable()`. Escrita exclusivamente via `supabaseAdmin` dentro do `createServerFn` (padrão já em uso).
- `src/lib/visit-template-extras.functions.ts`: estender `elders` para `{ observations, weekday, meeting_time }`.

**UI Templates** (`_app.modelo-reunioes-discursos.tsx`)
- Adicionar grid 2-col com Select de dia da semana + Input `type="time"`, ambos `readOnly={!isSuper}` / `disabled={!isSuper}`.
- i18n: `templates.meetingTalk.elders.weekday` e `.time` em pt/en/es.

**UI Congregação** (`MeetingPanels.tsx` → `EldersServantsPanel`)
- Adicionar bloco read-only `"<dia> — HH:MM"` no topo (similar ao Pioneiro), derivado de `extras.elders`.

---

### Ajuste 04 — Refletir em Resumo do Dia, dashboard e acessos elders/esposa

- **Resumo do Dia** (`src/components/visit-summary/VisitSummaryView.tsx`)
  - Trocar a base de filtro/exibição de Pioneiro: em vez de `meeting_at`, calcular a data efetiva da semana a partir de `extras.pioneer.weekday` + `meeting_time` (helper igual ao `isoFromWeekdayTime`); exibir dia/hora formatados.
  - Adicionar `elders` ao "today list" usando o mesmo padrão (weekday/time do template).
  - Adicionar o `final_song` do template ao bloco do midweek quando presente.
- **`src/lib/visit-summary.functions.ts`** e **`src/lib/guest.functions.ts`**
  - Carregar `meeting_talk_template_midweek.final_song` e `meeting_talk_template_elders.weekday/meeting_time`, `meeting_talk_template_pioneer.weekday/meeting_time` junto do snapshot e devolver em `snap.midweek/pioneer/elders` (ou em um campo `templateExtras`).
- **Dashboard** (`src/routes/_app.dashboard.tsx`, linhas 511–526 do `pushUpcoming`)
  - Para `pioneer`: usar `meeting_at` já materializado (após Ajuste 02 fica único e correto).
  - Adicionar entrada `elders`: resolver data a partir de `meeting_talk_template_elders.weekday/meeting_time` da `visit.meeting_talk_template_id` dentro da janela `start_date..end_date`.
- **Acesso "Corpo de Anciãos/ESC" e "Esposa do Superintendente"**: já consomem o mesmo `VisitSummaryView` / `guest.functions.ts`; nenhuma alteração extra além das acima.

---

### Segurança / Arquitetura

- Todas as escritas continuam dentro de `createServerFn` usando `supabaseAdmin` + middleware existente. Nada de `supabase.from().insert()` no cliente.
- Schemas Zod adicionados/atualizados validam `weekday` (0–6), `meeting_time` (HH:MM[:SS]) e strings com `trim()`.
- Migrações apenas adicionam/removem colunas; nenhuma tabela nova → políticas RLS existentes (`super manages …` / `members read linked …`) continuam válidas.
- Persistência offline (drafts dos painéis) preservada — apenas removemos o picker do Pioneiro e o bloco do Anciãos é puramente leitura, sem novo estado mutável.

### i18n

Novas chaves em `pt/en/es.json`:
- `meetingsTalks.fromTemplate.finalSong`
- `templates.meetingTalk.elders.weekday`, `.time`
- `meetingsTalks.pioneer.scheduledLabel` (label do bloco read-only) e `meetingsTalks.elders.scheduledLabel`

Remoção das chaves obsoletas `templates.meetingTalk.pioneer.weekdayCO`, `.timeCO`, `.sameAsMain`.

### Arquivos a editar

- `supabase/migrations/<nova>.sql` (drop pioneer SC + add elders weekday/time)
- `src/lib/meeting-talk-templates.functions.ts`
- `src/lib/visit-template-extras.functions.ts`
- `src/lib/visit-summary.functions.ts`
- `src/lib/guest.functions.ts`
- `src/routes/_app.modelo-reunioes-discursos.tsx`
- `src/components/meetings/MeetingPanels.tsx`
- `src/components/visit-summary/VisitSummaryView.tsx`
- `src/routes/_app.dashboard.tsx`
- `src/i18n/locales/{pt,en,es}.json`
