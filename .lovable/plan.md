# Itinerário exportado: observações e folhas do calendário

## (01) Observações nas semanas sem visita

Hoje o arquivo mostra só "Semana de Pioneiro". As observações que você digita na semana são ignoradas.

Depois do ajuste, o nome fica junto com a observação:

```text
┌──────────── Calendário (PDF) ─────────────┐
│ NOVEMBRO 2026                             │
│  S   T   Q   Q   S   S   D                │
│  2   3   4   5   6   7   8                │
│ [Cong. Jd. Alvorada ................]     │
│  9  10  11  12  13  14  15                │
│ [Semana de Pioneiro - Assembleia....]     │
└───────────────────────────────────────────┘

┌──────────── Lista (PDF/Word/Excel) ───────┐
│ 09/11 – 15/11  Semana de Pioneiro -       │
│                Assembleia     Sem visita  │
└───────────────────────────────────────────┘
```

- Vale para Semana de Pioneiro, Semana livre e tipos que você criou.
- Sem observação, fica como hoje (só o nome).
- Observação longa: no calendário é cortada com "…" para caber na faixa; na lista, Word e Excel aparece inteira (só a primeira linha).
- Vale para os 4 formatos (PDF calendário, PDF lista, Word, Excel).

## (02) 6 meses numa só página?

Não deveria. O calendário já está programado para 3 meses por folha (folha 1 e folha 2, com "Folha 1 de 2" no topo). O mais provável é que o leitor de PDF do celular esteja mostrando as duas folhas juntas, uma embaixo da outra, parecendo uma página só.

Vou confirmar gerando o arquivo de 6 meses e contando as folhas. Se estiver mesmo saindo numa folha só, corrijo para ficar exatamente:

```text
Folha 1: Set | Out | Nov
Folha 2: Dez | Jan | Fev
```

Também vou evitar uma 3ª folha quando o período "próximos 6 meses" começa no meio do mês (hoje isso pode virar 7 meses).

## Detalhes técnicos

- `src/lib/itinerary-export.ts` → `buildExportRows`: usar `parseCustomType(notes).rest` (primeira linha, trim) e montar `title = "<rótulo> - <observação>"`.
- `monthPages`: limitar a 6 meses quando o intervalo for "próximos 6 meses" (no máximo 2 folhas); verificar com teste que gera 2 páginas.
- Testes novos: título com observação, sem observação, e 6 meses = 2 folhas.
- Nada muda no banco nem na tela do Itinerário. Versão não sobe.
