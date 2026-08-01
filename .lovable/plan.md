## Diagnóstico (confirmado no código)

**Bug 01 — "Carregando dados…" eterno em Reuniões e Discursos**
`MeetingsTalksReportDialog.tsx` monta as seções dentro de um `useEffect` cujas dependências incluem `extras` (linha 234). O hook `useVisitTemplateExtras` retorna um **objeto novo a cada render** (`{ ...extras, templateExtras, reload }`). Resultado: o efeito roda em loop — `setLoading(true)` é chamado de novo antes de qualquer render estabilizar, então o diálogo nunca sai do estado "Carregando dados…" e o botão "Gerar PDF" fica desabilitado. O mesmo padrão existe em `MealsReportDialog.tsx` (linha 123), que sofre do mesmo defeito.

**Bug 02 — Dashboard gera "print" em vez de PDF premium**
O botão "Relatório executivo" do dashboard não chama o gerador de PDF: ele apenas navega para a rota `/relatorio/$visitId`, cuja única saída em PDF é `window.print()` (impressão da página HTML) — daí o aspecto de "print". A exportação alternativa dessa tela é Markdown. A engine premium (`pdf-lib` via `src/lib/pdf/pdf-engine.ts` + `generateVisitWeekPdf`) nunca é usada ali.

## Solução proposta

### 1. Estabilizar as dependências dos diálogos (Bugs de loop)
- Em `MeetingsTalksReportDialog.tsx` e `MealsReportDialog.tsx`: remover o objeto `extras` das dependências e depender apenas dos campos de texto realmente usados (ex.: `extras.field?.observations`, `extras.midweek?.observations`, …), extraídos em constantes antes do efeito.
- Garantir `setLoading(false)` também em caminho de erro (envolver a busca em `try/finally`), para nunca travar o diálogo se uma consulta falhar.
- Sem mudanças no hook compartilhado, evitando efeitos colaterais nas outras abas.

### 2. Relatório executivo premium no Dashboard
Manter a rota `/relatorio/$visitId` (visualização e impressão continuam existindo) e **adicionar** o caminho premium:
- Criar `src/components/visit-week/FullVisitReportDialog.tsx`, reutilizando `VisitWeekReportDialog` + `generateVisitWeekPdf` (mesma engine `pdf-lib` já usada nas abas — atende à regra de projeto "pdf-lib, nada de jspdf novo").
- Seções cobertas, cada uma selecionável por checkbox: Cronograma, Refeições, Transporte, Designações de campo, Reuniões de campo, Meio de semana, Fim de semana, Pioneiros, Anciãos e Servos, Checklist, e o bloco de identificação (congregação, tipo de visita, período, substituto).
- Cada bloco com título de seção em barra azul, cabeçalho por item (data/hora) e linhas "Rótulo: Valor" completas — o mesmo padrão visual das outras abas, com rodapé numerado.
- No dashboard, o botão "Relatório executivo" passa a abrir esse diálogo; um link secundário "Ver / imprimir" mantém o acesso à rota atual, para não remover nada que já existe.
- Na própria rota `/relatorio/$visitId`, adicionar o botão "PDF premium" usando o mesmo diálogo, ao lado de Markdown e Imprimir.

### 3. Verificação
- `bunx tsc --noEmit` limpo.
- Teste manual no preview: abrir o diálogo de Reuniões e Discursos (deve sair de "Carregando dados…" e gerar o PDF) e gerar o PDF completo pelo dashboard.

## Impacto em publicação e estabilidade
Mudanças 100% de frontend/apresentação: nenhuma alteração de banco, server functions, Capacitor, manifest Android ou service worker. Nada afeta o AAB/Play Store nem o funcionamento offline.
