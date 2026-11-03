# Itinerário: observações, calendário numa folha e botões do topo

## (01) Observações nas semanas sem visita

Hoje o arquivo mostra só "Semana de Pioneiro"; a observação digitada é ignorada. Depois do ajuste aparece junto: "Semana de Pioneiro - Assembleia".

- Vale para Semana de Pioneiro, Semana livre e tipos que você criou.
- Sem observação, fica só o nome, como hoje.
- Vale para os 4 formatos (PDF calendário, PDF lista, Word, Excel).
- No calendário, texto longo é cortado com "…" para caber; na lista, Word e Excel aparece inteiro.

## (02) Calendário: os 6 meses numa única folha

Sim, é possível. Folha deitada (paisagem), 2 linhas com 3 meses cada:

```text
┌──────────────────────────────────────────────────────┐
│ ITINERÁRIO · Circuito SP-12 · Set 2026 – Fev 2027    │
│ ┌─ SETEMBRO ─┐  ┌─ OUTUBRO ──┐  ┌─ NOVEMBRO ─┐      │
│ │S T Q Q S S D│  │S T Q Q S S D│  │S T Q Q S S D│     │
│ │[Cong. Alvor.]│ │[Sem. Pion. -│  │[Cong. Cent.]│     │
│ │ ...         │  │  Assembleia]│  │ ...         │     │
│ └─────────────┘  └─────────────┘  └─────────────┘     │
│ ┌─ DEZEMBRO ─┐  ┌─ JANEIRO ──┐  ┌─ FEVEREIRO ┐      │
│ │ ...         │  │ ...         │  │ ...         │     │
│ └─────────────┘  └─────────────┘  └─────────────┘     │
│ ■ visita  ■ sem visita            Gerado em 03/11/26 │
└──────────────────────────────────────────────────────┘
```

- Até 6 meses: 1 folha. Se escolher "ano de serviço" ou "tudo agendado" (mais de 6 meses), continua na folha seguinte, 6 meses por folha.
- As faixas ficam um pouco mais baixas e a letra um pouco menor para caber, mas ainda legível impressa.
- "Próximos 6 meses" que comece no meio do mês não vai gerar um 7º mês.

## (03) Botões do topo do Itinerário

Igual a Congregações: "Importar" entra dentro do "+ Nova visita", e o ícone de partilha vira um botão escrito "Exportar".

```text
ANTES                                  DEPOIS
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ Itinerário                  │       │ Itinerário                  │
│ [⇪ Importar] [⇧] [+ Nova    │       │ [⇧ Exportar] [+ Nova visita▾]│
│                    visita]  │       │              ┌────────────────┐
│                             │       │              │ ＋ Criar nova  │
│                             │       │              │ ⇪ Importar de  │
│                             │       │              │   arquivo      │
│                             │       │              └────────────────┘
└─────────────────────────────┘       └─────────────────────────────┘
```

- "Criar nova" abre o mesmo formulário de hoje; "Importar de arquivo" abre o mesmo seletor .ics/.csv de hoje.
- "Exportar" abre a mesma janela de exportação.
- A Ajuda é atualizada com os novos nomes dos botões.

## Detalhes técnicos

- `src/lib/itinerary-export.ts`: `buildExportRows` monta `title = rótulo + " - " + parseCustomType(notes).rest` (primeira linha); `monthPages` agrupa de 6 em 6; `itineraryPdfCalendar` desenha grade 3x2 em paisagem com `rowH` calculado pela altura disponível; intervalo "6 meses" alinhado a meses inteiros.
- `src/routes/_app.configuracoes.tsx`: DropdownMenu no "+ Nova visita" (Criar nova / Importar de arquivo usando o `importRef` existente); botão "Exportar" com texto no lugar do ícone `Share2`.
- `help-content.ts` atualizado; testes: título com/sem observação e 6 meses = 1 folha.
- Nada muda no banco. Versão não sobe.
