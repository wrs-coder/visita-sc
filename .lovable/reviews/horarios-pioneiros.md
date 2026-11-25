# Auditoria do dia e horário da reunião com pioneiros regulares

## Escopo
Leitura do código e dos gatilhos da tabela de ajustes por visita. Nenhuma edição de tela, mudança de horário ou migração foi feita nesta auditoria. Os problemas abaixo são confirmados pelo caminho do código; a ocorrência específica de 00/01 versus 12/13 ainda precisa de reprodução na reunião informada.

## Fontes de dados
- Modelo: `meeting_talk_template_pioneer.weekday` e `.meeting_time`.
- Ajustes apenas da visita: `visit_template_overrides.pioneer_weekday` e `.pioneer_meeting_time`.
- Cópia feita quando o modelo é aplicado: `pioneer_meetings.meeting_at` e `.super_meeting_at`.
- Valores efetivos: ajuste não nulo vence o modelo; campos não ajustados continuam vindo do modelo.
- Convenção de pioneiros: 0 = segunda-feira; 6 = domingo. Meio/fim de semana usam outra representação, com domingo = 0 e uma data âncora.

## Locais em que o dado aparece
| Local | Arquivo/função | Leitura e situação |
| --- | --- | --- |
| Modelo de Reuniões e Discursos → Pioneiros | `src/routes/_app.modelo-reunioes-discursos.tsx`, `Page` | Edita dia e hora do modelo. Horário por campo nativo `type=time`. |
| Semana da visita → Reuniões e Discursos → Pioneiros, edição e leitura | `src/components/meetings/MeetingPanels.tsx`, `PioneerPanel`, `ScheduleOverride` | Usa ajustes da visita sobre o modelo. Dia grava ao selecionar; hora grava ao sair do campo; Restaurar usa os valores do modelo. Não participa do rascunho do botão Salvar dados. |
| Início → Agenda / Reuniões de hoje e detalhes | `src/routes/_app.dashboard.tsx` | Prioriza dia/hora efetivos; recorre aos timestamps antigos se não conseguir resolver o horário. Os mesmos itens alimentam a linha do tempo. |
| Resumo da visita → Reuniões | `src/components/visit-summary/MeetingsTalksPanel.tsx`, `MeetingsTalksPanel` | Usa valores efetivos e `formatWeekdayTime`. |
| Resumo do dia / visualizações e compartilhamento do resumo | `src/components/visit-summary/VisitSummaryView.tsx`, `VisitSummaryView` | Filtra pelo dia efetivo; se ausente, recorre às datas antigas. Exibe dia/hora efetivos. |
| Painel do convidado/esposa → reuniões e resumo do dia | `src/routes/visitante.painel.tsx`, `pioneerWhen` | Usa valores efetivos do snapshot; filtra pelas datas antigas quando não há dia definido. |
| Compartilhar / prévia do painel do convidado | `src/routes/visitante.painel.tsx`, `SharePreview` e montagem do texto | Usa `pioneerWhen`, como a tela. |
| Relatório de Reuniões e Discursos | `src/components/visit-week/MeetingsTalksReportDialog.tsx` | Cabeçalho usa dia/hora efetivos; linha “Reunião com o SC” usa `super_meeting_at` antigo. Pode mostrar dois horários diferentes no mesmo documento. |
| Relatório da visita completa | `src/components/visit-week/FullVisitReportDialog.tsx` | Repete a mistura: cabeçalho efetivo e “Reunião com o SC” antiga. |
| Quadro de anúncios em PDF | `src/components/visit-week/board-program-export.ts`, `exportBoardProgram` | Prioriza `resolveWeekdaySlot` dos valores efetivos; timestamps antigos como alternativa. |
| Relatório antigo `/relatorio/$visitId` e sua exportação Markdown | `src/routes/_app.relatorio.$visitId.tsx`, `exportMarkdown` | Lê `meeting_at`, ignora ajustes por visita e mostra a data sem a hora da reunião. |
| Lembretes de reuniões | `src/lib/event-reminders.ts`, linha do tempo do Início | Dependem dos itens já calculados pela Agenda; não há edição separada da reunião de pioneiros neste módulo. |

## Funções relacionadas a edição, leitura e salvamento
- `getMeetingTalkTemplate`: carrega o modelo.
- `saveMeetingTalkTemplateItems`: grava o dia/hora do modelo em `meeting_talk_template_pioneer`.
- `duplicateMeetingTalkTemplate`, `exportMeetingTalkTemplate`, `importMeetingTalkTemplate`: transportam os mesmos campos na duplicação/exportação/importação.
- `applyMeetingTalkTemplateForVisit` e seu `resolveDate`: procuram o dia na semana da visita e gravam `meeting_at`/`super_meeting_at`.
- `setVisitTemplateOverride`: salva exclusivamente a tabela de ajustes por visita; não recalcula os dois timestamps da reunião.
- `getVisitTemplateExtras`: junta modelo e ajustes para a tela e o Início.
- `loadMergedVisitExtras`: faz a mesma combinação para os resumos e convidados.
- `getSuperVisitSummary`, `getGuestSnapshot`: carregam tanto timestamps quanto valores efetivos para os respectivos consumidores.
- `useVisitTemplateExtras` e `reload`: usam a chave `visit-template-extras` e resposta local guardada; invalidar a consulta não comprova que a resposta guardada foi atualizada.
- `useSingleRow`, `MeetingsDraftProvider.queue`/`flush`, `offlineUpdate`: atendem o rascunho e o botão Salvar dados dos outros campos de `pioneer_meetings`. `ScheduleOverride` segue outro caminho, direto.
- `formatWeekdayTime`: dia/hora dos pioneiros em relatórios e resumos.
- `formatAnchorWeekdayTime`, `anchorWeekday`: representação diferente do meio/fim de semana.
- `resolveWeekdaySlot`, `normalizeTime`, `buildDayTimeline`: data da visita, hora e ordenação da Agenda/lembretes.
- `fmtDateTime` nos relatórios: converte timestamps pelo fuso do aparelho.
- `formatDayTime`, `isoFromWeekdayTime`, `weekdayFromIso`, `hhmmFromIso`, `DayTimePicker`: usados nas reuniões de meio/fim de semana, importantes para a investigação mais ampla de Reuniões e Discursos.

## Problemas e riscos identificados
1. **Confirmado: duas fontes podem divergir.** Mudar dia/hora da visita salva o ajuste, mas deixa `meeting_at` e `super_meeting_at` como estavam. A tabela de ajustes só tem gatilho para `updated_at`, não para atualizar a reunião.
2. **Confirmado: relatórios misturam as fontes.** Dois relatórios usam o novo horário no cabeçalho e o antigo na linha “Reunião com o SC”.
3. **Confirmado: relatório antigo não acompanha a edição.** Ele não lê os ajustes nem apresenta a hora da reunião.
4. **Confirmado: salvamento diferente dos demais campos.** Dia/hora são enviados imediatamente, não pelo botão Salvar dados. As respostas `ok:false` não são examinadas por `ScheduleOverride` antes da recarga, deixando falhas sem indicação nesse caminho.
5. **Confirmado: meia-noite pode ser criada automaticamente.** `resolveWeekdaySlot` substitui hora ausente/inválida por `00:00`; `DayTimePicker` também usa `00:00` ao escolher dia sem hora, nas reuniões de meio/fim de semana.
6. **Risco de exibição de 12/24 horas.** Campos `type=time` podem mostrar AM/PM conforme navegador/sistema, embora o valor seja `HH:mm`. Isso não comprova alteração de 00:00 para 12:00 nos dados; 12 AM equivale a 00:00, enquanto 12 PM equivale a 12:00.
7. **Risco de fuso.** `resolveDate` monta data sem fuso e usa `toISOString`; relatórios leem o timestamp no fuso local. Já o valor textual de dia/hora não faz essa conversão. Dispositivos em fusos diferentes podem divergir.
8. **Risco de resposta local antiga.** Recarregar a consulta dos extras passa pelo cache local; é necessário verificar a atualização desse cache e dos snapshots depois de salvar, inclusive sem internet. Nenhum arquivo protegido foi modificado.

## Próxima correção a planejar
Definir uma única leitura do horário efetivo para todos os consumidores, preservar modelos e escolha dos anciãos, não reescrever datas antigas sem avaliar sua representação, evitar inventar meia-noite quando a hora não foi preenchida, alinhar salvamento e mensagens de erro e testar a mesma reunião em Agenda, resumos, acesso de anciãos/convidados e PDFs. Qualquer mudança visual precisa de mockup e aprovação antes de implementação.