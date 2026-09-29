# Corrigir dados antigos ou ausentes nos relatórios executivos

A estrutura dos relatórios não muda: mesmas seções, ordem e visual. Só passam a aparecer os dados certos.

## 1. Horários de Pioneiros e Anciãos
**Causa:** a aba "Reuniões e Discursos" pega o dia e o horário do modelo vinculado, ou do ajuste feito só para esta visita. O relatório usa um campo antigo, que a aba não mostra nem atualiza mais.
**Correção:** o relatório passa a mostrar o mesmo dia e horário da aba, por exemplo "Terça-feira · 19:30". Se a aba não tiver dia ou horário, mostra **"A combinar"**.
Vale para o relatório da aba e para o relatório completo da visita.

## 2. Outras informações antigas ou faltando
- **Meio de semana:** falta o "Cântico Final", que a aba mostra. Será incluído.
- **Fim de semana:** faltam "Cântico Inicial" e "Cântico Final". Serão incluídos. O campo que o relatório chama de "Tema da Sentinela" aparece na aba como **"Discurso Final"**. O nome no relatório será trocado para igualar ao da aba.
- **Observações do modelo (relatório completo):** o relatório da aba já mostra as "informações adicionais" de cada reunião, mas o relatório completo não. Elas serão incluídas da mesma forma.
- **Relatório completo da visita, Transporte:** o horário e as observações são lidos de campos que não existem. Por isso nunca aparecem. Passam a usar os dados reais: horário de ida e de volta, dia inteiro e notas.
- **Relatório completo da visita, Designações de campo:** o mesmo problema com o horário e as observações. Passam a usar o horário de encontro e as notas reais, mais o telefone de contato.

## 3. Checklist completo
- **Relatório da aba Checklist:** cada item mostra a situação escrita ("Concluído" ou "Pendente") e sempre mostra Descrição, Informações e Link/Notas. Campo vazio aparece como "—", para ficar claro o que ainda não foi respondido.
- **Relatório completo da visita:** hoje o checklist mostra só a marcação, porque lê um campo que não existe. Passa a mostrar as mesmas informações e respostas acima.
- Se houver respostas salvas no aparelho que ainda não foram enviadas, elas também entram no relatório. É a mesma fonte que a aba usa.

## Detalhes técnicos
- `MeetingsTalksReportDialog.tsx`: usar `extras.{pioneer,elders}.{weekday,meeting_time}` (a sobrescrita da visita tem prioridade sobre o modelo). Formatar em pt-BR. Quando não houver dado, usar "A combinar". Incluir `midweek.final_song` e `weekend.opening_song/closing_song`. Trocar o rótulo para "Discurso final". Usar primitivos nas dependências do efeito.
- `FullVisitReportDialog.tsx`: mesmas regras das reuniões, lendo os extras por `useVisitTemplateExtras`. No transporte, trocar os campos para `departure_time`, `return_time`, `all_day` e `notes`. Nas designações, trocar para `meeting_time`, `notes` e `contact_phone`. No checklist, trocar para `description`, `info_text` e `link_or_notes`.
- `ChecklistReportDialog.tsx`: ler por `readWithMirror`, como a aba já faz. Adicionar uma linha de status e mostrar "—" nos campos vazios.
- Sem mudanças no banco, na Bíblia offline ou no login. Validar com typecheck e testes.
