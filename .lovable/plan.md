# Plano — Reforços de integridade (Missões 1–5)

Mudanças **cirúrgicas**, sem tocar em exportações, modo offline, ou na lógica de templates/itinerário já estabilizada. Nenhuma migração de schema é necessária.

---

## Missão 1 — Permissões (Ancião não edita notas privadas nem campos somente leitura)

**Banco (já correto, apenas auditar):**
- `private_notes`: política `super writes notes by congregation` já exige `superintendent_id = auth.uid()` + `is_superintendent_of`. Ancião não tem como inserir/atualizar. ✓
- Demais tabelas de templates (`meeting_talk_template_*`, `checklist_templates`, `field_meeting_templates`, `talk_themes`): política `super manages ...` é `ALL` apenas para superintendente. ✓

**UI (corrigir):**
- `src/routes/_app.notas.tsx`: já bloqueia render para não‑super (`role !== "superintendent"` → restrito). ✓ Apenas adicionar guarda redundante em `add/update/delete` (early return se `role !== "superintendent"`), defesa em profundidade caso o componente seja chamado em outro contexto.
- `src/components/meetings/MeetingPanels.tsx`: nos painéis Pioneiros / Anciãos / Discurso de Serviço (campos que só o super edita), substituir `readOnly={!isSuper}` em todos os Textareas/Inputs sensíveis também por `disabled={!isSuper}` quando dentro de fieldset editável por ancião (evita foco/seleção indevida). Já está parcialmente coberto.
- Auditar `FieldText`/`FieldTextArea` para honrar `readOnly` impedindo `onSave` quando readOnly = true.

## Missão 2 — Traduções PT‑BR / EN / ES

Varrer chaves usadas nos arquivos editados nas missões anteriores e garantir presença nos 3 locales:

- `meetingsTalks.weekend.meetingDay`, `meetingsTalks.weekend.meetingTime`
- `meetingsTalks.midweek.meetingDay`, `meetingsTalks.midweek.meetingTime`
- `common.weekdays.sun..sat`
- `templates.meetingTalk.observationsPlaceholder` + `.observationsCounter` (nova, ver Missão 3)
- `meetingsTalks.observationsCounter` (nova)
- `common.charsRemaining` / `common.charsOver` (nova, p/ contador)

Auditar `src/i18n/locales/{pt,en,es}.json` para paridade de chaves (sem remover existentes).

## Missão 3 — Contador + validação de 4000 caracteres

Componente novo **`<CharCounterTextarea>`** em `src/components/ui/char-counter-textarea.tsx`:
- Props: `value`, `onChange`, `max=4000`, demais props de `Textarea`.
- Renderiza `<Textarea>` + contador `n / max` (muted), vira `text-destructive` quando `value.length > max * 0.9`.
- Trunca via `onChange` para nunca exceder `max` (defensivo, além de `maxLength`).
- Mensagem clara via `aria-live="polite"` quando próximo/excedendo.

Aplicar em **todos os Textareas de Observações/Informações adicionais** (limite 4000):
- `src/routes/_app.modelo-reunioes-discursos.tsx`: midweek, weekend, pioneer, elders observations (4 campos).
- `src/components/meetings/MeetingPanels.tsx`: `observations` da reunião de Pioneiros e demais painéis que aceitam observações (até 4000).
- `src/routes/_app.notas.tsx`: `content` e `additional_info` (já existem, adicionar contador sem mudar persistência).

Não altera schema nem RLS.

## Missão 4 — Indicador visual de salvamento (templates + itinerário)

Padrão já existente em `_app.reunioes-discursos.tsx` (`draft.saving` → `Loader2` animado + texto). Replicar minimamente:

- **`src/routes/_app.modelo-reunioes-discursos.tsx`**: já há estado local `saving` na função `save()`. Expor um `SavingBadge` (componente pequeno reutilizável em `src/components/SavingIndicator.tsx`) no topo do card de edição: ícone `Loader2 animate-spin` + label `t("common.saving")` enquanto a Promise está pendente; após sucesso mostra `Check` + `t("common.savedAt", { time })` por 2s.
- **`src/routes/_app.configuracoes.tsx`** (itinerário): envolver os pontos de gravação de visita (`createVisit`/`updateVisit`/`deleteVisit`) com um `useState` `savingVisit` e exibir o mesmo `<SavingIndicator />` no header do diálogo e na lista.
- Aplicar a mesma badge em `_app.modelo-reunioes-de-campo.tsx` e `_app.checklist-modelos.tsx` (mesma família de templates) usando o componente compartilhado.

Sem mudanças no `MeetingsDraftContext` existente, sem mexer em offline/sync.

## Missão 5 — Auto‑cálculo de Início (Terça) e Fim (Domingo) na criação de visita

**Status atual** (`_app.configuracoes.tsx` linhas 170–199): já existe a lógica que pega a **última visita do itinerário** (qualquer congregação) e calcula **próxima terça** + **domingo** (terça + 5 dias). ✓

**Reforços (sem regressão):**
1. Garantir que o cálculo roda **toda vez** que o diálogo "Nova visita" abre (não apenas no primeiro mount). Usar `useEffect` disparado por `dialogOpen && !editId` que reseta `form.start_date`/`form.end_date` com a próxima terça calculada **no momento da abertura** (snapshot fresco de `visits`).
2. Quando o super altera manualmente `start_date`, manter o auto‑snap de `end_date = start_date + 5d` apenas se domingo (lógica já existe linha 499–509); validar que `start_date` é terça via `getDay() === 2`, caso contrário avisar via `toast.info` (não bloquear — campo livre).
3. Ao **excluir** a última visita, recalcular sugestão na próxima abertura (já coberto pelo passo 1, pois consulta a lista atualizada).
4. Validar limite: `end_date >= start_date` (já existe linha 234).

Sem mudanças em RLS — `super manages visits` continua única responsável.

---

## Arquivos editados

- `src/components/ui/char-counter-textarea.tsx` (**novo**)
- `src/components/SavingIndicator.tsx` (**novo**)
- `src/routes/_app.notas.tsx` (guarda defensiva + contador)
- `src/components/meetings/MeetingPanels.tsx` (contador em observations, reforço readOnly)
- `src/routes/_app.modelo-reunioes-discursos.tsx` (contador + SavingIndicator)
- `src/routes/_app.modelo-reunioes-de-campo.tsx` (SavingIndicator)
- `src/routes/_app.checklist-modelos.tsx` (SavingIndicator)
- `src/routes/_app.configuracoes.tsx` (recalcula datas ao abrir diálogo + SavingIndicator)
- `src/i18n/locales/{pt,en,es}.json` (novas chaves `common.saving`, `common.savedAt`, `common.charsRemaining`, `common.charsOver`, paridade auditada)

## Verificações de não‑regressão

- Nenhum arquivo de offline (`sw.js`, `offline-supabase.ts`, `offline-queue.ts`, `offline-prefetch.ts`) é tocado.
- Nenhuma export/PDF (`template-io.functions.ts`, `backup.functions.ts`) é tocada.
- Sem migrações; nenhuma política de RLS, GRANT ou trigger alterada.
- `MeetingsDraftContext` preservado integralmente.
- `useSingleRow`/`offlineUpdate` inalterados.
