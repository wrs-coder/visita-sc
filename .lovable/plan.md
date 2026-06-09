# Onda 7.6 — PDF local com `pdf-lib`

## Objetivo
Substituir `jspdf` por `pdf-lib` na geração de PDFs do app, **sem mudar nenhum layout visual** já validado e **sem quebrar nenhum fluxo**. Ganhos: bundle menor a longo prazo (remover `jspdf`), saída 100% offline, controle preciso de fontes embutidas (suporte real a acentuação e caracteres latinos), e PDFs editáveis/mescláveis no futuro.

## Estado atual
- `pdf-lib` já está instalado (usado em `src/lib/template-backup.server.ts`).
- `jspdf` é usado em **5 lugares** (dois deles rasterizam HTML via `html-to-image`):
  1. `src/components/visit-week/pdf-utils.ts` — helper compartilhado (texto + cabeçalhos coloridos).
  2. `src/components/elder-program/ElderExecutiveReportDialog.tsx` — relatório executivo.
  3. `src/routes/_app.notas.tsx` — exportar notas como PDF (texto).
  4. `src/components/visit-summary/VisitSummaryView.tsx` — usa `html-to-image` → PNG → jsPDF.
  5. `src/routes/visitante.painel.tsx` — usa `html-to-image` → PNG → jsPDF.

## Escopo desta subonda

### Em escopo (migrar para `pdf-lib`)
- **(A)** Criar `src/lib/pdf/pdf-engine.ts` — engine compartilhada baseada em `pdf-lib` com helpers de alto nível: `createA4Document()`, `writeText()` (com wrap, bold, cor, indent), `drawSectionBar()`, `addPageNumbers()`, `toBlob()`, e `embedStandardFonts()` (Helvetica + Helvetica-Bold via `StandardFonts`). Unidade interna em **mm** (com conversão para pt) para casar com o layout atual.
- **(B)** Reescrever `src/components/visit-week/pdf-utils.ts` mantendo a **mesma API pública** (`generateVisitWeekPdf`, `slugify`, `kv`, `ReportSection`, `VisitWeekPdfInput`) por cima da nova engine. Layout idêntico: A4 retrato, margem 12mm, barra azul-clara nas seções, numeração no rodapé.
- **(C)** Reescrever `ElderExecutiveReportDialog.tsx` (apenas a função de geração; o JSX e a UI ficam intactos). Mesma diagramação atual.
- **(D)** Reescrever `_app.notas.tsx` (apenas a função `exportToPdf`; o resto da rota fica intacto).

### Fora de escopo (manter `jsPDF` por ora)
- **(E)** `VisitSummaryView.tsx` e **(F)** `visitante.painel.tsx` rasterizam HTML em PNG via `html-to-image` e só usam jsPDF como contêiner de imagens. Trocar nesses dois exige **reembutir as imagens** com `doc.embedPng()` + cálculo de páginas, e o ganho é mínimo (o peso é a imagem, não o engine). **Mantenho jsPDF nesses dois fluxos** para não arriscar regressões visuais nos relatórios mais delicados (visitante/visita). Eles entram numa Subonda 7.6b se você aprovar depois.

> Como `jspdf` continua sendo usado por (E) e (F), **não removo a dependência `jspdf` do `package.json` nesta subonda**. A remoção fica pendente para quando (E) e (F) também migrarem. Isto é uma decisão consciente para preservar estabilidade.

### Preservação obrigatória
- Acentuação portuguesa correta em todos os textos (usar `StandardFonts.Helvetica` que cobre Latin-1; se algum caractere fora do conjunto aparecer, fazer fallback com sanitização — mas o conteúdo atual é PT-BR padrão, então Helvetica basta; **não** vou embutir fonte TTF custom nesta subonda para não inchar o bundle).
- Margens, tamanhos de fonte (8/9/10/14pt equivalentes), espaçamentos verticais, cor da barra de seção `rgb(235,240,250)`, cor do título da seção `rgb(30,50,100)`, paleta cinza dos metadados — todos iguais aos atuais.
- Numeração `i / total` no rodapé direito.
- Quebras de página automáticas com a mesma função `ensure(h)`.

## Detalhes técnicos

```text
src/lib/pdf/
  pdf-engine.ts        ← nova engine pdf-lib (compartilhada)
src/components/visit-week/
  pdf-utils.ts         ← reescrito sobre pdf-engine, API igual
src/components/elder-program/
  ElderExecutiveReportDialog.tsx   ← só a função de geração muda
src/routes/
  _app.notas.tsx       ← só a função exportToPdf muda
```

Engine em mm:
```ts
const MM_TO_PT = 2.83465;
const mm = (v: number) => v * MM_TO_PT;
```
- pdf-lib trabalha com origem no canto inferior-esquerdo; a engine encapsula a conversão para coordenadas "y desce" (estilo jsPDF) para minimizar mudanças nas chamadas existentes.
- Wrap de texto: implementar `wrapText(text, font, size, maxWidth)` usando `font.widthOfTextAtSize`. Sem dependência de Canvas/DOM, funciona no SSR e em workers.
- Carregamento dinâmico: `await import("pdf-lib")` dentro de cada gerador (mantém o chunk fora do bundle inicial), exatamente como hoje com jsPDF.

## Verificação
- `bunx tsc --noEmit` limpo.
- Build limpo (harness).
- Smoke manual:
  - Gerar PDF da aba Semana da Visita (cada aba que usa `generateVisitWeekPdf`).
  - Gerar "Relatório executivo" em `ElderExecutiveReportDialog`.
  - Exportar uma nota em `/notas`.
  - Conferir: acentuação, barra azul nas seções, numeração no rodapé, quebras de página.
- Confirmar que `/visitante` e `VisitSummaryView` (que continuam em jsPDF) seguem gerando idênticos.

## Riscos e mitigações
- **Risco:** diferença sutil de métricas de fonte entre jsPDF e pdf-lib pode mudar onde a linha quebra. **Mitigação:** usar `font.widthOfTextAtSize` (precisão real) em vez de aproximação; tolerar diferença de ±1 linha por bloco.
- **Risco:** algum caractere fora de Latin-1 (emoji, símbolo). **Mitigação:** sanitizar substituindo por `?` com warning no console; o conteúdo atual dos relatórios é puro PT-BR.
- **Risco:** quebrar a API pública de `pdf-utils.ts`. **Mitigação:** manter assinaturas e tipos exportados idênticos; só o miolo muda.

## Memória
- Atualizar `mem://index.md`: adicionar nota "Engine de PDF padrão: `pdf-lib` via `src/lib/pdf/pdf-engine.ts`. `jspdf` ainda usado em VisitSummaryView e visitante.painel (rasterização HTML)."

## Fora desta subonda (próximas)
- 7.6b: migrar (E) e (F) e remover `jspdf` do `package.json`.
- 7.7 Command Palette, 7.8 Editor de notas premium, 7.9 Acessibilidade.
