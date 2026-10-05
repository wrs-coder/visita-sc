# Recolher/expandir nos Modelos

Mesma setinha das abas da visita, agora nas telas de criação de modelos. Por padrão tudo abre expandido; a escolha fica guardada só neste aparelho, por usuário e por modelo. Nada muda nos dados salvos nem no que os modelos geram nas visitas.

## Onde aparece
- **Modelo de Reuniões de Campo:** cada dia e cada reunião de campo.
- **Modelo de Programação (Estudos, Refeições, Transporte):**
  - Estudos e Revisitas: cada dia e cada turno.
  - Refeições: cada dia (o aviso do dia passa a ficar dentro do próprio dia) e cada refeição.
  - Transporte: cada dia e cada trajeto.
- **Modelo de Pastoreios, Recomendações e outros:** cada seção e cada evento.
- Botão "Recolher tudo / Expandir tudo" no topo de cada modelo.

## Mudança visível no modelo
Hoje, nos modelos, os itens aparecem numa lista única, cada um com o seletor de dia. Para dar para recolher "cada dia", os itens passam a ser **agrupados por dia** (Dia 1, Dia 2...), na mesma ordem de hoje. Ao trocar o dia de um item no seletor, ele muda para o grupo do novo dia. Os avisos por dia de Estudos e de Refeições passam a aparecer dentro do dia correspondente; as observações gerais continuam onde estão.

Recolhido, cada item mostra uma linha curta (ex.: "Manhã · 08:30" ou "Almoço · 12:00 · anfitrião"). O que está sendo digitado não se perde ao recolher, e o botão "Salvar modelo" continua sempre visível.

## Detalhes técnicos
- Reutilizar `CollapseProvider`/`CollapseIdToggle`/`CollapseBody`/`CollapseItem`/`CollapseAllButton` de `src/components/ui/collapsible-blocks.tsx`; `visitId` recebe o id/slot do modelo (ex.: `tpl:${slot}`), com escopos `tpl-program`, `tpl-field`, `tpl-elder`.
- `_app.modelos.tsx`: `KindBlock` agrupa `filtered` por `day_offset` só na apresentação, mantendo os índices originais (`i`) para `onUpdate`/`onRemove`; os inputs de nota por dia de estudo/refeição vão para dentro do cabeçalho do grupo do dia (mesmos handlers `saveStudyNote`/`saveMealNote`). Dias sem item ainda mostram o grupo quando têm campo de aviso.
- `_app.modelo-reunioes-de-campo.tsx`: agrupar `items` por dia na renderização, cada item em `CollapseItem`.
- `_app.modelo-programacao-ancioes.tsx`: cada `section` com `CollapseIdToggle` no título e cada `EventEditor` em `CollapseItem`.
- Sem mudança de banco, servidor, login ou abertura do app. Validar com `bunx tsgo --noEmit`, `bunx vitest run` e conferir no navegador a tela de modelos.
