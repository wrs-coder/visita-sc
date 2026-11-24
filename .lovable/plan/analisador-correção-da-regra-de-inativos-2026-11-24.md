# Analisador — correção da regra de Inativos

## O que está errado hoje
- A palavra "inativo" no cartão, sozinha, já marca a pessoa como inativa — mesmo que ela tenha pregado ("Part." marcado) no último mês.
- A contagem de meses sem pregar termina no último mês com relatório do arquivo, e não no último mês do período escolhido (De/Até).
- Não existe como desfazer manualmente.

## Nova regra (única)
Inativo = **6 meses seguidos ou mais sem pregar, terminando no último mês do período analisado**.
- Pregou ("Part.") no último mês do período → **nunca** é inativo, mesmo com a palavra "inativo" no cartão.
- A palavra "inativo" sozinha não decide mais; vira só um aviso no cartão ("Cartão diz 'inativo', mas a regra dos 6 meses não confirma").
- Perigo de ficar inativo (4 ou 5 meses seguidos) continua igual, também contado até o último mês do período.
- Mudar o período (6 meses / ano / De-Até) e tocar em "⟳ Recalcular" refaz a situação.

## Opção "Não está inativo" no cartão da pessoa
```text
┌──────────────────────────────────┐
│ ✕   Maria Souza                  │
│ Grupo 3 · Publicadora batizada   │
│ ⚠ Inativa: 7 meses sem pregar    │
│ ┌──────────────────────────────┐ │
│ │ ☐ Não está inativa           │ │
│ │   (volta ao grupo de origem) │ │
│ └──────────────────────────────┘ │
│ [Ano 2026] [Ano 2027] [Ambos]    │
│ ... tabela mês a mês ...         │
└──────────────────────────────────┘
```
- Marcar → a pessoa sai de "Inativos" e volta ao grupo dela; desmarcar → volta à regra automática.
- A escolha fica salva com a análise (aparelho) e vai no "Salvar análise".
- Só aparece para quem está inativo ou marcado manualmente.

## Não muda
Conversor S-21, app VisitaSC, importação, totais, meta PR, alerta de possível PR, PDF (só passa a usar a regra nova).

## Detalhes técnicos
- `analyzer.js` `inactiveMap(cards, upTo, overrides)`: `last = upTo` (fim do período); se o mês `last` tem participação → não inativo; `inactive = streak >= 6 && !overrides[key]`; `flag` só gera `flagNote`. Chave da pessoa = `normName` (mesma usada em `people`).
- `app.js` `recalc()` passa `state.period.to` e `state.notInactive`; `openPerson` mostra caixa de seleção → atualiza `state.notInactive`, salva no IndexedDB e chama `recalc()`; textos da legenda/aba Inativos/PDF ajustados.
- Testes novos em `ferramentas-testes/`: pregou no último mês + palavra "inativo" → não inativo; 6 meses até o fim do período → inativo; 5 meses → perigo; meses sem pregar fora do período não contam; opção manual impede inativo.
- `instructions-ferramentas.md`: regra atualizada.
