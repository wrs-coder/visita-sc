# Onda 7.6 — PDF local com `pdf-lib` ✅ entregue

Engine compartilhada em `src/lib/pdf/pdf-engine.ts` (API jsPDF-like sobre pdf-lib).
Migrados:
- `src/components/visit-week/pdf-utils.ts` (API pública preservada)
- `src/components/elder-program/ElderExecutiveReportDialog.tsx`
- `src/routes/_app.notas.tsx`

Mantidos em jsPDF (rasterizam HTML via html-to-image — migração entra como 7.6b):
- `src/components/visit-summary/VisitSummaryView.tsx`
- `src/routes/visitante.painel.tsx`

`bunx tsc --noEmit` limpo.
