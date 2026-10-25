# Ajustes da pílula de tempo (tamanho, opacidade, posição)

## O que muda
Um pequeno botão de ajustes aparece ao lado de "Recolher todos", na barra acima dos tópicos. Essa barra já aparece nos modos esboço e tela cheia, inclusive quando o esboço é aberto pelo painel. Ao tocar no botão, abre um balão com:
- **Tamanho:** Pequeno, Médio ou Grande. O padrão é Pequeno, como hoje.
- **Opacidade:** controle deslizante de 30% a 100%. O padrão é 60%.
- **Posição:** Esquerda, Centro ou Direita. O padrão é Direita.
- **Restaurar padrão.**

As mudanças aparecem na hora em todas as pílulas do esboço. Ficam guardadas só neste aparelho e valem para todos os esboços.

## O que não muda
Banco, formato salvo do esboço, cálculo de horários, tocar na pílula para concluir, cronômetro e modo edição.

## Validação
- Teste: os ajustes salvos são lidos corretamente, e valores inválidos voltam ao padrão (por exemplo, opacidade fora de 30–100).
- `bunx tsgo --noEmit` e `bunx vitest run`.

## Detalhes técnicos
- Novo `src/lib/topic-badge-prefs.ts`: `{ size: "sm"|"md"|"lg", opacity: number, position: "left"|"center"|"right" }`. Fica no localStorage (`visita-sc:topic-badge-prefs`), com `useSyncExternalStore` e `normalizeBadgePrefs()`. Teste em `topic-badge-prefs.test.ts`.
- `TopicTiming.tsx`: a variante `floating` lê as preferências. Tamanho por classes (`text-[10px]`, `text-xs`, `text-sm`) e opacidade por `style={{ opacity }}`. Os tópicos concluídos multiplicam por 0,6.
- `OutlineTopicBlock.tsx`: a linha sticky usa `justify-start pl-2`, `justify-center` ou `justify-end pr-11` conforme a posição. O espaço reservado ao lado do título acompanha a posição.
- `OutlineTopicsToolbar`: botão de ajustes com `Popover`, `ToggleGroup`, `Slider` e `Button` já existentes. Textos em PT, EN e ES.
- Regra no AGENTS.md: as preferências visuais da pílula ficam só no aparelho e nunca entram no HTML do esboço.
