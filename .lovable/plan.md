# Analisador: voltar a analisar qualquer período (ex.: 6 meses entre dois anos de serviço)

## O que aconteceu
No último ajuste, o período ficou preso a um ano de serviço inteiro (set a ago), escolhido pelas pílulas "Ano 2026 / Ano 2027". A junção dos cartões de dois anos numa pessoa só continua funcionando, mas não há mais como escolher, por exemplo, **mai/2026 a out/2026** (parte no cartão 2025/2026 e parte no cartão 2026/2027).

## Como fica (celular)

```text
┌─────────────────────────────────┐
│ Período da análise              │
│ (●6 meses) ( Ano 2026 )( Ano 2027 ) ( Outro )
│                                 │
│ De  [ mai/2026 ▾ ]              │
│ Até [ out/2026 ▾ ]              │
│                                 │
│ mai/2026 a out/2026 · 6 meses   │
│ Usa cartões 2025/2026 e 2026/2027│
└─────────────────────────────────┘
```

- **6 meses** (já vem marcado): os 6 últimos meses que têm relatório na congregação. Ex.: hoje, mai a out/2026.
- **Ano 2026 / Ano 2027**: o ano de serviço inteiro, como hoje (2025/2026 = 2026).
- **De / Até**: o superintendente pode mudar livremente os meses; a pílula passa para "Outro". Os meses oferecidos vão do primeiro ao último mês existente em todos os cartões.
- A linha de baixo diz quais anos de cartão entram no período.
- Resumo, listas, cartão mês a mês, PDF e "Salvar análise" usam esse período. Análises salvas antigas abrem com o período que tinham.

## Regras que não mudam
- "2025/2026" = ano 2026; "2026/2027" = ano 2027.
- Cartões da mesma pessoa de anos diferentes viram uma pessoa só, e os meses dos dois cartões são somados no período.
- Meses ainda sem relatório na congregação não contam (nem como irregular).
- Nada do aplicativo VisitaSC é alterado.

## Detalhes técnicos
- `analyzer.js`: novas funções puras `lastMonths(cards, n)` (últimos n meses com relatório) e `periodYears(from,to)`; `analyze` já aceita qualquer `from/to`.
- `app.js`: `state.preset` ("6m" | ano | "custom"); `fixPeriod` só recalcula quando o preset não é "custom"; dois `<select>` De/Até (De ≤ Até, troca automática se invertido); salvar/abrir guarda `preset` e `period`.
- `index.html`/`style.css`: campos De/Até lado a lado abaixo das pílulas.
- Testes em `src/lib/congregation-analyzer.test.ts`: período mai–out/2026 junta cartões 2026 e 2027 da mesma pessoa e conta os 6 meses; "6 meses" termina no último mês com relatório.
- Conferência com Playwright em 393×687.
