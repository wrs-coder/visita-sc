# Resumo da Semana (superintendente) + ocultar observações da esposa

## 1. Resumo da Semana — subaba "Hoje" e nova subaba "Reuniões"

**O que está errado hoje**
- Meio de semana e Anciãos aparecem em "Hoje" todos os dias da visita (o filtro só verifica se hoje está dentro da visita, não o dia da semana).
- Meio de semana não mostra dia/horário; Pioneiros ainda usa a data antiga gravada em vez do dia/horário da aba "Reuniões e Discursos".
- O Resumo da Semana do superintendente não tem a subaba "Reuniões" (só o painel dos anciãos tem).

**Correções**
- "Hoje" mostra cada reunião apenas no dia da semana configurado:
  - Meio de semana e Fim de semana: dia/hora da data âncora.
  - Pioneiros e Anciãos: dia/hora do modelo ou do ajuste da visita.
  - Reunião sem dia definido ("A combinar") não aparece em "Hoje".
- Cada reunião em "Hoje" exibe "Dia · Horário" no título, além de presidente, temas, cânticos, orações, local e observações já existentes.
- Nova subaba "Reuniões" no Resumo da Semana do superintendente, com o mesmo conteúdo da subaba do painel dos anciãos (meio de semana, fim de semana, pioneiros, anciãos com dia/horário e extras). Não aparece para a esposa.

## 2. Cronograma — "Ocultar observações da esposa"

Sim, é possível. Novo botão abaixo de "Ocultar para esposa":
- Ativado: o compromisso aparece para a esposa, mas sem o campo "Observações".
- Fica desabilitado quando "Ocultar para esposa" está ligado (o evento já está todo oculto).
- Indicador discreto no card do compromisso para o superintendente.
- Anciãos/ESC continuam vendo as observações normalmente (a regra é só para a esposa).

## Detalhes técnicos
- `VisitSummaryView.tsx`: filtros de "Hoje" por `anchorWeekday` (meio/fim) e `templateExtras.{pioneer,elders}.weekday` comparados com o dia de hoje (0 = segunda); títulos com `formatAnchorWeekdayTime` / `formatWeekdayTime`; adicionar TabsTrigger/TabsContent "reunioes" (quando `!wifeMode`), reaproveitando a renderização do painel de anciãos em `visitante.painel.tsx` extraída para componente compartilhado. `visit-summary.functions.ts`: incluir `meeting_at` e `final_song` necessários no select do meio de semana.
- Migração: `ALTER TABLE circuit_schedule_events ADD COLUMN hide_notes_from_spouse boolean NOT NULL DEFAULT false` (sem mudança de RLS/grants).
- `_app.cronograma.tsx`: novo Switch no formulário, gravar o campo, ícone no card.
- `guest.functions.ts` (wifeMode) e caminho offline/espelho local: zerar `notes` quando `hide_notes_from_spouse` for verdadeiro, no servidor, antes de enviar à esposa.
- Novas chaves de tradução pt/en/es. Typecheck e testes ao final; nova versão do app necessária para o celular.
