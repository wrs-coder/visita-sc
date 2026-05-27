## Missão 1 — Subaba "Fim de Semana": substituir "Dia e Horário da Reunião" por seletor de dia + hora

Arquivo: `src/components/meetings/MeetingPanels.tsx` (painel Fim de Semana).

- Remover o input `type="datetime-local"` ligado a `weekend_meetings.meeting_at`.
- Em seu lugar, renderizar dois controles lado a lado:
  1. **Dia da semana** — `Select` shadcn com 7 opções (Domingo…Sábado) traduzidas via i18n.
  2. **Hora da reunião** — `Input type="time"`.
- Leitura: derivar `weekday` e `HH:mm` do `meeting_at` salvo (`getDay()`, `getHours()`, `getMinutes()`). Se `meeting_at` for nulo, ambos ficam vazios.
- Escrita: ao alterar qualquer um dos dois, recalcular um `Date` âncora (semana corrente, próximo `weekday` escolhido, com a hora informada) e salvar em `meeting_at` (timestamptz) usando o `save()` existente do `useSingleRow`. Sem migração — coluna já existe.
- Mantém `disabled={!canEdit}` (super + anciãos editam, conforme regra atual do painel).

## Missão 2 — Subaba "Meio de Semana": novo campo "Hora da Reunião" como PRIMEIRO campo

Arquivo: `src/components/meetings/MeetingPanels.tsx` (painel Meio de Semana) + migração.

- **Migração** adicionando coluna `meeting_at timestamptz NULL` em `public.midweek_meetings`. Sem alterações de RLS/GRANT (a tabela já está liberada para os papéis corretos). Após aprovação, `src/integrations/supabase/types.ts` é regenerado automaticamente.
- Atualizar o `useSingleRow<MidweekRow>` para incluir `meeting_at` na lista de colunas e no tipo local.
- Renderizar o bloco "Dia e Hora da Reunião" (mesma UI da Missão 1: `Select` de dia + `Input type="time"`) **como o primeiro campo da subaba**, acima de "Presidente da Reunião".
- A ordem final da subaba passa a ser:
  1. **Dia e Hora da Reunião** (novo)
  2. Presidente da Reunião
  3. Tema: Discurso de Serviço
  4. Cântico Final
  5. Oração Final
  6. Observações
- `disabled={!canEdit}` preservado em todos os campos. `maxLength={4000}` nas Textareas mantido.

## Missão 3 — i18n (PT, EN, ES)

Arquivos: `src/i18n/locales/pt.json`, `en.json`, `es.json`.

Adicionar (mesclando sem remover chaves existentes):

- `meetingsTalks.weekend.meetingDay` — "Dia da Reunião" / "Meeting Day" / "Día de la Reunión"
- `meetingsTalks.weekend.meetingTime` — "Hora da Reunião" / "Meeting Time" / "Hora de la Reunión"
- `meetingsTalks.midweek.meetingDay` — mesmas traduções
- `meetingsTalks.midweek.meetingTime` — mesmas traduções
- `common.weekdays.0`…`common.weekdays.6` — Domingo…Sábado / Sunday…Saturday / Domingo…Sábado

A label antiga "Dia e Horário da Reunião" permanece nas locales (não removida) para evitar quebra em qualquer outra referência.

## Segurança e integridade

- Apenas 1 migração aditiva (coluna nullable) — não quebra dados existentes nem queries atuais.
- Nenhuma alteração em: `public/sw.js`, snapshot/offline (`offline-shells.ts`, `snapshot-cache.ts`), exportação (`template-io.functions.ts`), modelos (`_app.modelo-reunioes-discursos.tsx`), itinerário, RLS, GRANTs, server functions, login online/offline.
- Resumo da Semana e demais consumidores de `weekend_meetings.meeting_at` continuam lendo o mesmo `timestamptz` — formato no banco inalterado.
- Restrições de edição (`canEdit`) e `maxLength` preservadas; superintendente continua sem bloqueios.
- Validação pós-implementação: abrir Fim de Semana, escolher dia + hora, salvar, recarregar e confirmar persistência; idem em Meio de Semana com o novo campo como primeiro; alternar idioma PT→EN→ES e verificar labels.
