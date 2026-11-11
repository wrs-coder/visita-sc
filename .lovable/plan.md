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

---

# Falha no Controle de tempo: sino e "Programa adiantado"

## Causa encontrada
1. **Sino sumido**: o sino só compara quando a data do evento é hoje. Seu evento é 05/12, então às 02:23 ele ficou escondido de propósito (foi uma trava que coloquei para evitar números enormes em testes).
2. **"Programa 15 min adiantado" errado**: o topo hoje só soma a duração das partes (o discurso tinha 16 min, você usou ~1 min → "15 adiantado"). Ele não olha a hora do celular.

## Correção
1. **Sino sempre ativo pela hora do celular**: compara a hora real em que a parte começou com o horário do programa, em qualquer dia (só a hora do dia). Mostra horas quando passar de 60 min: "−7h37" (verde, adiantado) ou "+1h05" (vermelho).
2. **Topo pelo relógio real**: "Programa" passa a comparar o fim real (ou previsto, se a parte ainda corre) da última parte usada com o fim que o programa marcava.
   - Seu exemplo: discurso das 10:00 iniciado às 02:23 → "Programa 7h37 adiantado".
   - Parte rodando e estourando → atraso cresce ao vivo.
3. Relatório PDF usa a mesma conta. Série de discursos mantém a regra atual.

```text
┌──────────────────────────────┐
│ Feliz É Aquele Que Confia…   │
│ 05/12/2026 · SAV             │
│ 09:00 – 16:00                │
│ ( Programa 7h37 adiantado )  │ verde
├──────────────────────────────┤
│ 3 Discurso tema…   ┌───────┐ │
│ 10:00 → 02:23      │ 15:12 │ │
│ (🔔 −7h37) verde   │(16min)│ │
│ João · Cong. Centro└───────┘ │
└──────────────────────────────┘
```

## Detalhes técnicos
- `event-timer.ts`: `startDelayMin` sem trava de data (usa hora do dia de hoje); novo `clockProgramDiff(parts, state, now, eventStart)` = fimReal(última parte iniciada) − fimPrevisto; `summarize` passa a expor esse valor como `programDiff`; formatador `fmtDelay` (min / h).
- `EventTimerFocus.tsx` e `timer-report-pdf.ts` usam os novos valores.
- Testes: caso 10:00 iniciado 02:23 → −457 min; parte estourando; série.
