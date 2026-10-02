# Corrigir dias, horários e informações no acesso "Corpo de Anciãos e ESC"

## Causa confirmada
É o mesmo erro que corrigimos no relatório executivo, mas no acesso dos anciãos ele continua:
- **Dia e horário de Pioneiros e Anciãos:** o acesso mostra um campo antigo gravado na reunião. Esse campo a aba "Reuniões e Discursos" não mostra nem atualiza mais. A aba usa o "Dia e Horário (definido pelo Superintendente)", que vem do modelo ou do ajuste feito só para esta visita. Esse valor nunca é enviado ao acesso dos anciãos.
- **Ajustes feitos só para esta visita são ignorados:** observações, cânticos de fim de semana e dia/horário editados na visita não chegam ao acesso. O acesso lê apenas o modelo original.
- **Cântico Final do meio de semana:** não é enviado ao acesso.
- **Rótulo:** o campo que a aba chama de "Discurso Final" aparece sem nome no acesso.

## Outras falhas encontradas na revisão
- **Reuniões de campo:** o local de encontro não é enviado ao acesso.
- **Designações de campo:** as observações (notas) não são enviadas.
- **Meio de semana e Anciãos:** o dia mostrado vem do mesmo campo antigo. Por isso a tela "Hoje" pode esconder ou mostrar a reunião no dia errado.
- Refeições, transporte, checklist, cronograma e Programa de Anciãos estão corretos.

## Correção
- Pioneiros e Anciãos mostram o mesmo dia e horário da aba, por exemplo "Sábado · 10:30". Se a aba não tiver dia ou horário, mostra "A combinar". A ordem dos dias é a mesma da aba, que começa na segunda-feira.
- Os ajustes da visita têm prioridade sobre o modelo, igual à aba: observações, cânticos e dia/horário.
- Incluir o Cântico Final do meio de semana. Dar o rótulo "Discurso Final" ao campo de fim de semana.
- Mostrar o local de encontro das reuniões de campo e as observações das designações de campo.
- Corrigir também o "Resumo da Semana" do superintendente, porque ele usa a mesma tela.
- Nada mais muda: o layout, a senha do acesso, o Programa de Anciãos, o banco, a Bíblia e o login continuam iguais.

## Validação
- Comparar a aba com o acesso dos anciãos para Pioneiros, Anciãos, Meio de semana e Fim de semana.
- Rodar o typecheck e os testes.

## Detalhes técnicos
- `src/lib/guest.functions.ts`: ler `visit_template_overrides` da visita. Buscar `weekday` e `meeting_time` em `meeting_talk_template_pioneer` e `meeting_talk_template_elders`, e `final_song` em `meeting_talk_template_midweek`. Mesclar com a regra override > modelo, a mesma de `visit-template-extras.functions.ts`. Devolver `templateExtras` no formato `VisitTemplateExtras`.
- `src/lib/visit-summary.functions.ts`: devolver também `templateExtras`, usando a mesma lógica compartilhada.
- `src/routes/visitante.painel.tsx` e `VisitSummaryView.tsx`: nos cards de Pioneiros e Anciãos, usar `formatWeekdayTime` de `report-schedule.ts` como cabeçalho em vez de `meeting_at`. Mostrar `midweek.final_song`. Pôr o rótulo em `talk_theme_title`. Na tela "Hoje", decidir pelo dia da semana dos extras quando ele existir.
- Sem migrações.
