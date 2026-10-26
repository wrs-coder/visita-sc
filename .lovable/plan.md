# Relatório executivo no "Resumo da semana" para a comissão

## Resposta curta
Sim, faz mais sentido. Hoje cada aba do "Programa da visita" tem seu próprio botão "Relatório executivo" (Anciãos, Refeições, Reuniões, Transporte...). Para a comissão, isso obriga a gerar 5 ou 6 PDFs separados. O app já tem um **relatório completo da visita** (usado no Início do superintendente) que junta tudo num PDF só. O lugar natural dele é o "Resumo da semana".

## O que muda
1. **Resumo da semana** ganha um botão "Relatório completo" no topo, para superintendente e comissão. Gera um único PDF com todas as seções da visita.
2. O relatório atual do Resumo (só cronograma) continua para o superintendente, dentro do mesmo menu.
3. Nas abas do "Programa da visita", o botão grande vira um ícone discreto de PDF ao lado do título (padrão iOS/One UI). Nada é removido, quem quiser só uma seção ainda consegue.
4. O que cada ancião vê no PDF continua limitado ao que ele já pode ver hoje.

```text
┌─────────────────────────────┐
│ Resumo da semana       [PDF]│  <- Relatório completo
│ Congregação X • semana      │
├─────────────────────────────┤
│ Cronograma ...              │
│ Estudos ...                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Anciãos                  ⤓  │  <- ícone discreto (só esta aba)
│ [Anciãos][Estudos][Reuniões]│
└─────────────────────────────┘
```

## Detalhes técnicos
- `_app.resumo-semana.tsx`: botão abre `FullVisitReportDialog` (já existente) com `visitId` do snapshot; para super, um menu com "Completo" e "Só cronograma" (`WeekSummaryReportDialog`).
- `VisitWeekReportButton` ganha variante `icon` (Button ghost size icon + aria-label); aplicada em `programa-ancioes`, `refeicoes` e demais abas que o usam.
- Sem mudança de banco nem de regras de acesso; o PDF lê com a mesma permissão do usuário.
- Validar com tsgo e vitest.
