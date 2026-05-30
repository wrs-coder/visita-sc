## Reestruturação: Transporte nos Modelos de Programação Pessoal

### 1. `src/routes/_app.modelos.tsx`
- Expandir `PayloadEditor` para `kind === "transport"` com: `event_type` (select), `direction` (select), `all_day` (checkbox), `departure_time`, `return_time`, `driver_name`, `contact_phone`, `description`, `notes`.
- Atualizar `addItem(..., "transport")` com defaults: `event_type: "field_service"`, `direction: "round_trip"`, `all_day: false`.

### 2. `src/lib/templates.functions.ts`
- Em `applyTemplateToVisit` para `kind === "transport"`, inserir em `transport_schedule` os campos `event_type`, `direction`, `all_day`, `departure_time`, `return_time`, com `weekday` calculado a partir de `targetDate`. Quando `all_day: true`, anular os horários.

### 3. `src/routes/_app.transporte.tsx`
- Reverter ao formato pré-Missão 6: remover `useServerFn` (upsert/toggle/delete/applyAllDayDriver), remover selects/checkboxes avançados.
- Manter campos básicos: `event_date`, `driver_name`, `contact_phone`, `description`, `notes`.
- Continuar exibindo registros já criados (inclusive os vindos de modelos) em modo somente leitura para os campos novos.
- Usar `supabase.from("transport_schedule")` direto no cliente (RLS já protege por `congregation_id` via `can_edit_visit`).

### 4. `src/lib/transport.functions.ts`
- Remover arquivo (não mais necessário).

### 5. i18n (`pt.json`, `en.json`, `es.json`)
- Renomear `templates.program.title` e `nav.scheduleTemplates` → "Modelos de Programação Pessoal" / "Personal Schedule Templates" / "Plantillas de Programación Personal".
- Adicionar chaves para os novos campos de transporte no editor de modelos.

### Garantias
- **Dados preservados**: nenhuma migração destrutiva; `transport_schedule` mantém todas as linhas existentes.
- **Segurança**: RLS atual em `transport_schedule` (`can_edit_visit`) já restringe edição por `congregation_id`.
- **Fluxo**: aplicação do modelo grava corretamente `all_day`, `event_type` e `direction` para a visita.
