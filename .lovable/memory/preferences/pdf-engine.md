---
name: Engine de PDF padrão
description: pdf-lib via src/lib/pdf/pdf-engine.ts é o motor padrão de geração de PDF; jspdf ainda usado só em VisitSummaryView e visitante.painel
type: preference
---
Engine padrão de geração de PDF do app: `pdf-lib` via `src/lib/pdf/pdf-engine.ts` (`createJsPdfCompat`), que expõe API jsPDF-like (origem top-left, y desce). **Why:** Onda 7.6 padronizou o motor para preparar remoção do jspdf e ganhar embed real de fontes + saída 100% offline. **How to apply:** todo novo gerador de PDF (texto/tabelas) deve usar `createJsPdfCompat`. `jspdf` segue como dependência APENAS porque `VisitSummaryView.tsx` e `visitante.painel.tsx` rasterizam HTML em PNG via `html-to-image` e usam jsPDF como contêiner de imagens (migração 7.6b pendente). Não introduzir novos usos de `jspdf`.
