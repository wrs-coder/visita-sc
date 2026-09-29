# Corrigir o dia da semana de Pioneiros e Anciãos no relatório

## Causa confirmada
A aba conta os dias começando pela **segunda-feira** (0 = Segunda … 6 = Domingo). O relatório contava começando pelo **domingo** (0 = Domingo … 6 = Sábado). Por isso o relatório sempre mostrava um dia antes: Sábado virava Sexta, Sexta virava Quinta. O horário já estava certo.

## Correção
- O relatório passa a usar a mesma ordem de dias da aba. Exemplo: "Sábado · 10:30" e "Sexta-feira · 19:00".
- "A combinar" continua aparecendo quando não houver dia nem horário.
- Vale para o relatório de "Reuniões e Discursos" e para o relatório completo da visita, que usam o mesmo ajuste.
- Nada mais muda: nem a estrutura do relatório, nem as outras informações.

## Detalhes técnicos
- `src/components/visit-week/report-schedule.ts`: reordenar `WEEKDAYS_PT` para Segunda…Domingo, igual a `templates.weekdays` em pt.json.
- Adicionar um teste pequeno (0 → Segunda, 4 → Sexta, 5 → Sábado, 6 → Domingo, vazio → "A combinar").
- Validar com typecheck e testes. Sem mudanças no banco.
