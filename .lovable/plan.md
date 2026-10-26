# "Programação geral" no Resumo da semana

## Resposta curta
Sim, faz mais sentido. Hoje cada aba do "Programa da visita" tem seu próprio botão "Relatório executivo", e a comissão precisa gerar vários PDFs separados. O app já tem um relatório completo da visita (hoje usado no Início do superintendente) que junta tudo num PDF só. Ele passa a ficar no "Resumo da semana" com o nome **Programação geral**.

## O que muda
1. **Resumo da semana**: um ícone discreto ⤓ no canto do título (rótulo de acessibilidade "Programação geral"), para superintendente e comissão.
2. Ao tocar, abre a janela "Programação geral" com caixas para escolher o que entra no PDF:
   Identificação, Cronograma, Refeições, Transporte, Designações, Reuniões de campo, Meio de semana, Fim de semana, Pioneiros, Anciãos, Checklist. Também há "Marcar todos" e "Desmarcar todos".
3. Uma chave nova: **"Incluir observações do superintendente"**, ligada por padrão. Se você desligar, o PDF sai sem as observações dos modelos.
4. O relatório atual do Resumo (só cronograma) continua disponível para o superintendente, num menu junto do ícone.
5. Nas abas do "Programa da visita", o botão grande "Relatório executivo" vira o mesmo ícone discreto ⤓. Nada é removido.
6. Cada ancião só vê no PDF o que já pode ver hoje.

```text
┌─────────────────────────────┐
│ Resumo da semana         ⤓  │
│ Congregação X • semana      │
└─────────────────────────────┘

┌─ Programação geral ─────────┐
│ [x] Identificação           │
│ [x] Cronograma              │
│ [x] Refeições  [x] Transp.  │
│ [x] Reuniões   [x] Anciãos  │
│ ...                         │
│ ─────────────────────────── │
│ Incluir observações    (ON) │
│                             │
│ [ Cancelar ]  [ Gerar PDF ] │
└─────────────────────────────┘
```

## Detalhes técnicos
- `_app.resumo-semana.tsx`: botão ghost size icon (`FileDown`, aria-label "Programação geral"). Ele abre `FullVisitReportDialog`; para o superintendente, um DropdownMenu com "Programação geral" e "Só cronograma" (`WeekSummaryReportDialog`).
- `FullVisitReportDialog`: prop de título "Programação geral"; estado `includeObs` repassado ao `VisitWeekReportDialog` por meio de um novo slot `extraOptions`. Ao gerar, se `includeObs` estiver desligado, as seções saem sem `additionalInfo`. A escolha de seções que já existe é reaproveitada.
- `VisitWeekReportButton` ganha variante `icon`, aplicada às abas do programa e a `programa-ancioes`.
- Sem mudança de banco nem de regras de acesso. Validar com tsgo e vitest. Registrar a tarefa em roadmap.md.
