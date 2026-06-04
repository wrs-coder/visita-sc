## Confirmações iniciais

1. **Diálogo de conflito de modelo:** opção padrão = **"Manter preenchimento dos anciãos"**. Sobrescrever exige clique consciente do SC.
2. **Retenção do PDF de backup:** disponível até o **início da visita (terça-feira da semana, 00:00 no fuso da congregação)**. Depois disso uma rotina de limpeza remove o snapshot.

## Item 3 — Botão "Relatório executivo" em todas as abas de Semana da Visita

Replicar o padrão de `/programa-ancioes` (componente `ElderExecutiveReportDialog`): botão `<FileDown /> Relatório executivo` no cabeçalho da página, diálogo com checkboxes de seções, geração via `jspdf` e download via `saveBlob` (já cobre Web Share / File System Access / Capacitor).

Abas que recebem o botão (cada uma com seu próprio `<Tab>ExecutiveReportDialog.tsx`, pois o conteúdo difere):

| Rota | Seções selecionáveis no PDF |
|---|---|
| `/resumo-semana` | Eventos por dia, observações gerais |
| `/comunicacao-casal` | Mensagens do casal por dia + observações |
| `/escala` (Estudos de Campo) | Estudos por dia, anfitriões, observações |
| `/reunioes-discursos` | Cada subaba como seção + observações + "Informações adicionais do superintendente" |
| `/reunioes-de-campo` | Reuniões por dia/turno + observações + "Informações adicionais do superintendente" |
| `/refeicoes` | Refeições por dia + observações por dia + gerais |
| `/transporte` | Itens por dia + observações |
| `/checklist` | Itens agrupados com status |

Padrão idêntico ao existente: `variant="outline" size="sm"` logo abaixo do título, checkboxes por seção, opção "Incluir Informações adicionais do superintendente", A4 retrato Helvetica, barra de título azul por seção, paginação, arquivo `relatorio-executivo-<aba>-<slug-visita>-<data>.pdf`, toasts `sonner`. Sem mudar lógica de negócio das abas; sem migrations.

Reuso: extrair helpers de PDF (`writeText`, `ensure`, `slugify`, header, paginação) para `src/components/visit-week/pdf-utils.ts`. Componentes novos em `src/components/visit-week/`. O `ElderExecutiveReportDialog` existente fica intacto.

## Item 4 (novo) — Aviso ao excluir visita com preenchimento dos anciãos

Hoje a exclusão usa `FinishVisitDialog` (e há também exclusão direta no itinerário). Adicionar verificação prévia + alerta amigável.

### Comportamento
- Quando o SC aciona "Excluir visita" no itinerário/cronograma:
  - Antes de abrir o diálogo destrutivo, consultar quais tabelas-filhas da visita já têm conteúdo preenchido pelos anciãos.
  - Se houver preenchimento → mostrar **card/diálogo amigável** com:
    - Mensagem: "Os anciãos desta congregação já começaram a preencher a visita **{título}**."
    - Lista resumida do que já foi preenchido (ex.: "3 refeições", "2 reuniões e discursos", "1 designação de campo", "Observações do casal preenchidas").
    - Quem preencheu (nome do ancião) e quando (última edição), quando essa informação existir em `updated_by`/`updated_at`.
    - Botão **"Manter visita agendada"** (padrão, destacado) e botão secundário **"Excluir mesmo assim"** (variante destructive). "Excluir mesmo assim" abre o fluxo de exclusão atual (S-303 etc.).
  - Se não houver preenchimento → segue direto para o `FinishVisitDialog` atual, sem fricção adicional.

### Detalhes técnicos
- Novo `createServerFn` em `src/lib/visit-deletion.functions.ts`:
  - `getVisitFillSummary({ visitId })` com `requireSupabaseAuth`.
  - Faz `count` em cada tabela-filha já listada em `CHILD_TABLES` (`meals`, `meal_day_notes`, `transport_schedule`, `field_assignments`, `field_meetings`, `schedule_events`, `checklist_items`, `midweek_meetings`, `weekend_meetings`, `pioneer_meetings`, `elders_servants_meetings`) considerando apenas linhas com conteúdo (campos texto/JSON não vazios) — não conta placeholders criados automaticamente.
  - Retorna `{ hasContent: boolean, items: Array<{ label, count, lastEditor?, lastEditedAt? }> }`.
- Novo componente `src/components/VisitDeletionGuardDialog.tsx` que envolve o gatilho de exclusão: chama a server fn, decide entre mostrar aviso ou abrir `FinishVisitDialog` direto.
- Substituir os call-sites atuais do `FinishVisitDialog` (itinerário/cronograma) pelo wrapper.
- Sem migrations; sem alterar regras de RLS (a contagem usa o cliente autenticado do SC, que já tem permissão de leitura nessas tabelas).

## Fora de escopo desta entrega
- Auto-aplicação dos modelos do SC nas visitas agendadas, diálogo de conflito por visita, snapshot/PDF de backup automático, notificação aos anciãos — esses pontos ficam apenas **confirmados** aqui (itens 1 e 2). Serão planejados em rodada separada, pois envolvem migrations (tabela de snapshots, job de limpeza por congregação), gatilho ao salvar modelo, e UI de notificação.

## Pergunta antes de implementar
- Posso entregar agora apenas os itens 3 (Relatório executivo em todas as abas) e 4 (aviso amigável antes de excluir visita), e abrir um plano separado para a auto-aplicação de modelos + PDF de backup + notificação? Mantém PRs pequenos e testáveis. Se preferir tudo junto, sinalize e eu expando este plano.
