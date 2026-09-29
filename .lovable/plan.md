# Corrigir horários de Pioneiros e Anciãos no relatório executivo

## Causa encontrada
- Na aba "Reuniões e Discursos", o dia e o horário dessas duas reuniões vêm do **modelo vinculado**, ou do ajuste feito só para esta visita (campo "Dia/Horário").
- O relatório executivo usa outro campo antigo, gravado na própria reunião, que a aba não mostra nem atualiza mais. Por isso aparece um horário velho ou diferente.

## O que muda
- No relatório, o cabeçalho de "REUNIÃO COM PIONEIROS" e de "REUNIÃO COM ANCIÃOS E SERVOS MINISTERIAIS" passa a mostrar exatamente o dia e horário da aba (por exemplo, "Terça-feira · 19:30").
- Se a aba não tiver dia/horário definido, o relatório volta a usar o dado antigo. Se esse também não existir, usa o título padrão atual.
- A estrutura, as seções, a ordem, os campos e o visual do relatório continuam iguais. Só muda o texto de dia/horário.

## Detalhes técnicos
- Arquivo: `src/components/visit-week/MeetingsTalksReportDialog.tsx`.
- Ler `extras.pioneer.weekday/meeting_time` e `extras.elders.weekday/meeting_time` (de `useVisitTemplateExtras`, que já considera o ajuste da visita antes do modelo). Guardar esses valores como primitivos nas dependências do efeito, para evitar o loop já documentado.
- Formatar como "Dia-da-semana · HH:MM" com os nomes em português. A ordem de uso será: agenda da aba, depois `meeting_at`, depois o título padrão.
- A linha "Reunião com o SC" (`super_meeting_at`) continua igual.
- Sem mudanças no banco. Validar com typecheck e testes.
