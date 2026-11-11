# Conferência: ajustes refletidos nas exportações e cartas

## O que já está certo
- Série de discursos: horários dos "•" nos convites, cartas e PDF do programa seguem a regra da série (não empurram o programa).
- "Informar próximo orador": convite e carta mostram "Próximo orador: Nome" quando marcado (inclusive a marcação automática do Simpósio/Série).
- PIN: só sai no convite/carta no modo "Link único + PIN", criado sozinho ao copiar.
- Relatório do Controle de tempo: PDF próprio com resumo executivo.

## O que ainda falta alinhar (3 correções pequenas)
1. **Informações adicionais**: sumiram da tela, mas se um evento antigo tiver esse texto ele ainda é impresso em "Informações: ..." no convite, na carta e não dá para ver/editar. Correção: deixar de imprimir nos convites, cartas e Word (o texto fica guardado, sem apagar nada).
2. **Presidente e Oração**: se uma parte antiga tiver "Participações" marcadas, ainda aparecem no convite, na carta e no PDF do programa. Correção: ignorar participações nessas duas designações em todas as saídas.
3. **Teste automático** garantindo as duas regras acima.

Sem mudança visual de tela, sem mudança no servidor.

## Detalhes técnicos
- `invite.ts` (buildInviteText) e `letter-template.ts` (caixa da designação): remover linha `extra_info`; pular `extrasLabel` quando part_type for Presidente/Oração (helper `allowsExtras(partTypeId)` reaproveitado do BigEvents).
- `program-pdf.ts`: mesmo filtro de extras.
- Testes em `big-events.test.ts` / `letter-template.test.ts`.
