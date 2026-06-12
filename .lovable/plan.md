# Onda 7.11 — Missões 03 + 04 ✅ entregues

## Missão 03 — Popup bíblico persistente

`src/components/bible/BibleVersePopover.tsx`:
- Política nova de fechamento: o popover **nunca fecha sozinho**.
- `allowCloseRef` gate em `onOpenChange`: só permite `false` quando o
  usuário acionou deliberadamente o botão **X** ou deu **double-tap**
  no conteúdo (`< 350 ms` entre toques).
- Qualquer outro pedido de fechar é descartado: Escape, clique fora,
  blur, focus outside, toggle no trigger, perda de foco em Tela Cheia.
- Mantidos os bloqueios já existentes (`onEscapeKeyDown`,
  `onPointerDownOutside`, `onInteractOutside`, `onFocusOutside`).
- `handleDoubleTapClose` e `handleTextTouchEnd` agora usam
  `explicitClose()` que sinaliza o gate.

## Missão 04 — Olho expandido no cartão "Pastoreiem"

`src/routes/_app.dashboard.tsx`:
- `DetailsKey` ganha 4 chaves novas: `elder-pastoral`,
  `elder-encouragement`, `elder-recommendations`, `elder-local`.
- Cada `TabsContent` do cartão "Pastoreiem" recebe um cabeçalho com
  o nome da subaba + botão **Eye** (`Ver detalhes`). Mesmo padrão
  visual dos demais cartões (Checklist, Reunião de campo, etc.).
- Adicionados 4 `DayDetailsDialog` (reaproveita componente
  somente-leitura existente) com a versão expandida de cada subaba:
  - **Pastoreio**: Slot, Acompanhante, Endereço, Membros, Espiritual.
  - **Encorajamento**: Categoria, Contato, Saúde, Endereço, Info.
  - **Recomendações**: Propósito, Grupo de campo, Info, Sugerido por.
  - **Assuntos Locais**: Sugerido por, Info, Fontes.
- Linhas vazias são filtradas (`v && v.trim().length > 0`).
- Reusa os mesmos dados já carregados em `elderPastoral` /
  `elderEncouragement` / `elderRecommendations` / `elderLocal` — zero
  rede adicional.

## Verificação
- `bunx tsc --noEmit` 100% limpo.

## Próximas missões
- Nenhuma pendente do bloco original — Missões 01, 02, 03, 04, 05A e
  05B entregues. Aguardando próxima onda.
