# Corrigir dia e horário do Meio de Semana e Fim de Semana no acesso dos anciãos

## Causa confirmada
Na aba "Reuniões e Discursos", o superintendente escolhe só um **dia da semana** e um **horário**. Para guardar isso, o app grava uma data de referência fixa de janeiro de 2024 (domingo 07/01/2024 + o dia escolhido). A aba lê só o dia da semana e o horário dessa data, por exemplo "Terça-feira — 19:30".

O acesso "Corpo de Anciãos e ESC" mostra essa data de referência como se fosse uma data real, por exemplo "09/01 19:30". Por isso o dia aparece errado. Pelo mesmo motivo, a tela "Hoje" nunca encontra essas reuniões no dia certo.

## Correção
- As subabas "Reunião do meio de semana" e "Reunião do fim de semana" mostram o mesmo texto da aba, por exemplo "Terça-feira · 19:30" e "Domingo · 09:00". Sem dia nem horário, mostram "A combinar".
- A tela "Hoje" mostra essas reuniões quando o dia da semana de hoje for o dia escolhido, dentro da semana da visita.
- Corrigir também o resumo copiado/compartilhado e o "Resumo da Semana" do superintendente, que usam a mesma informação.
- Nada mais muda: layout, senha do acesso, outras subabas, banco, Bíblia e login continuam iguais.

## Validação
- Comparar a aba com o acesso dos anciãos para Meio de semana e Fim de semana.
- Teste automático do novo cálculo (data de referência para "Terça-feira · 19:30").
- Typecheck e testes.

## Detalhes técnicos
- Novo helper `formatAnchorWeekdayTime(iso)` em `src/components/visit-week/report-schedule.ts`: `new Date(iso).getDay()` (0 = Domingo, mesma regra de `weekdayFromIso`/`formatDayTime` em `MeetingPanels.tsx`), converter para a ordem de `formatWeekdayTime` (0 = Segunda) e horário local HH:mm.
- `src/routes/visitante.painel.tsx`: trocar `fmtIso`/`format(..., "dd/MM HH:mm")` em `MeetingsTalksGuestPanel`, no bloco da linha ~1109 e no texto compartilhado (~280–290); na tela "Hoje", `fmtAt` só horário e filtros `todayMidweek`/`todayWeekend` por dia da semana em vez de `isSameDay`.
- `src/components/visit-summary/VisitSummaryView.tsx`: mesma troca onde exibir `meeting_at` de midweek/weekend.
- Sem migrações.
