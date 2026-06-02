## Objetivo

Adicionar a função "ver detalhes em popup" em três lugares, mantendo um padrão visual único (ícone `Eye` no canto do cartão → `Dialog` somente-leitura com todos os dados do dia):

1. **Dashboard** — nos cartões Reunião de Campo, Estudos e Revisitas, Refeições de hoje, Reuniões de hoje, Transporte do dia e Checklist da Congregação. **Não** mexer no cartão "Esboços e Notas".
2. **Resumo do Dia → subaba "Hoje"** (em `VisitSummaryView`) — um botão no topo da aba que abre um popup com tudo o que está sendo mostrado para o dia (refeições, designações, reuniões de campo, transporte, programação, reuniões do dia).
3. **Resumo da Semana → subaba "Transporte"** (mesmo `VisitSummaryView`) — em cada cartão de dia agrupado, um botão que abre um popup com todos os detalhes daquele dia de transporte (motorista, telefone, tipo, direção, horários, descrição, observações de cada linha).

Como `VisitSummaryView` é o componente compartilhado usado tanto em `_app.resumo-semana.tsx` (acesso atual de anciãos / esposa do superintendente) quanto em `visitante.painel.tsx` (acesso antigo via visitante), uma única alteração contempla os dois fluxos.

## Comportamento (idêntico nas 3 telas)

- Ícone `Eye` (lucide-react), 16px, cor `text-muted-foreground hover:text-primary`, `aria-label="Ver detalhes do dia"`.
- Ao clicar, abre `Dialog` (shadcn), `max-h-[85vh] overflow-y-auto`, com:
  - Título: contexto + data (ex.: "Transporte · Qua, 03/06/2026").
  - Conteúdo: mesmos dados já exibidos, sem `truncate`/`line-clamp`, com rótulos legíveis.
  - Botão "Fechar" no rodapé. Somente leitura.
- Não altera nenhum comportamento existente (expandir/recolher, "Ver tudo", agrupamentos, contagens, sincronização, RLS).
- Nenhuma chamada nova à rede; usa os dados já presentes no snapshot/estado — **exceto** o cartão Checklist do dashboard, cuja query precisa de mais colunas (`title, description, link_or_notes, info_text, sort_order`).

## Implementação técnica

### 1. Componente novo, reutilizável

`src/components/dashboard/DayDetailsDialog.tsx`
- Wrapper genérico baseado em `Dialog`.
- Props: `open`, `onOpenChange`, `title`, `subtitle?`, `children`.
- Estilos: `max-h-[85vh] overflow-y-auto`, rodapé com botão Fechar.
- Usado pelos três pontos (dashboard, VisitSummaryView Hoje, VisitSummaryView Transporte).

### 2. Dashboard — `src/routes/_app.dashboard.tsx`

- Importar `Eye` e `DayDetailsDialog`.
- Estado `const [openDetails, setOpenDetails] = useState<null | "field" | "studies" | "meals" | "meetings" | "transport" | "checklist">(null);`
- Em cada um dos 6 cartões, o `headerRight` passa a ter o ícone `Eye` (botão) **antes** do link "Ver tudo":
  ```tsx
  <div className="flex items-center gap-2 shrink-0">
    <button type="button" onClick={() => setOpenDetails("meals")} aria-label="..."><Eye className="h-4 w-4" /></button>
    <Link to="/refeicoes">{t("common.viewAll")} <ChevronRight className="h-3 w-3" /></Link>
  </div>
  ```
- Renderizar 6 `DayDetailsDialog` no fim do componente, reaproveitando o JSX dos cartões sem truncamento.
- Ampliar o `select` de `checklist_items` em `loadVisitData` e o tipo `ChecklistItem` para incluir `title, description, link_or_notes, info_text, sort_order`. Cartão continua usando só `status` para o progresso.
- **Não** alterar o cartão "Esboços e Notas".

### 3. Resumo do Dia — subaba "Hoje" em `VisitSummaryView`

- Localizar a aba `value="hoje"` (renderiza `<TodayPanel snap={snap} />` no arquivo `src/components/visit-summary/VisitSummaryView.tsx`).
- No topo do painel "Hoje", ao lado do rótulo da data, adicionar um botão `Eye` que abre um `DayDetailsDialog` único.
- Conteúdo do dialog: concatena as seções já renderizadas para hoje — Refeições, Designações de campo, Reuniões de campo, Reuniões do dia (meio/fim/pioneiros/anciãos), Programação, Transporte do dia — todas filtradas por `todayIso` (variáveis já existentes no componente: `todayMeals`, `todayField`, `todayFieldMeetings`, `todaySchedule`, `todayTransport`, `todayWeekend`, `todayPioneer`, etc.).
- Esconde seções vazias. Respeita `snap.wifeMode` (não mostrar Checklist, mesma regra que já existe).

### 4. Resumo da Semana — subaba "Transporte" em `VisitSummaryView`

- Na aba `value="trans"`, dentro do `groupTransport(snap.transport).map((g) => …)`, adicionar no cabeçalho de cada `Card` (linha com `Car` + data) um botão `Eye` à direita.
- Estado local na aba: `const [openTransKey, setOpenTransKey] = useState<string | null>(null);`
- Ao clicar, abre `DayDetailsDialog` com:
  - Título: data formatada do grupo (`fmtDate(head.event_date)`).
  - Conteúdo: lista completa das linhas `g.rows` daquele dia, mostrando para cada uma: tipo, direção, horários ida/volta, motorista, telefone, descrição, observações e flag "apoiar todos os eventos" quando aplicável — sem truncar.

### 5. i18n

`src/i18n/locales/{pt,en,es}.json`:
- `common.viewDayDetails` — "Ver detalhes do dia" / "View day details" / "Ver detalles del día"
- `common.close` (se ainda não existir)
- `guest.today.detailsTitle` — "Resumo do dia" / "Day summary" / "Resumen del día"
- `guest.transport.dayDetailsTitle` — "Detalhes do transporte" / "Transport details" / "Detalles del transporte"

## Arquivos afetados

- `src/components/dashboard/DayDetailsDialog.tsx` (novo)
- `src/routes/_app.dashboard.tsx` (botões + 6 dialogs + ampliar select do checklist)
- `src/components/visit-summary/VisitSummaryView.tsx` (botão + 1 dialog no painel "Hoje"; botão por dia + 1 dialog na aba "Transporte")
- `src/i18n/locales/pt.json`, `en.json`, `es.json` (novas chaves)

## Cobertura por tipo de acesso

- **Dashboard**: superintendente, esposa em modo dashboard e anciãos (já compartilham a mesma rota).
- **Resumo do Dia "Hoje"** e **Resumo da Semana "Transporte"**: como `VisitSummaryView` é importado por `_app.resumo-semana.tsx` (acesso atual de anciãos/esposa logada) e por `visitante.painel.tsx` (acesso antigo via visitante), a alteração cobre automaticamente **todos** esses perfis sem código duplicado.

## Fora do escopo

- Cartão "Esboços e Notas" — não é tocado.
- Funções atuais (expandir/recolher, "Ver tudo", contagens, progresso, sincronização, RLS, edição) — preservadas.
- Demais subabas do Resumo da Semana (Cronograma, Estudos, Campo, Refeições, Checklist) — não recebem o popup nesta entrega; podem ser adicionadas depois usando o mesmo `DayDetailsDialog`.
