# Aviso "Referência não encontrada" na tela cheia

## O que acontece

No modo tela cheia, a referência errada aparece sublinhada em vermelho, mas ao tocar nada é exibido. O aviso até é criado, porém fica **atrás** do fundo da tela cheia, invisível para o usuário.

Causa confirmada: a tela cheia do esboço ocupa a camada 100 (e a tela cheia do painel usa uma janela própria), enquanto o balão de "Referência não encontrada" é criado na camada 50. O balão de versículo normal já usa camada 110, por isso ele funciona e o outro não.

## Correção

1. Colocar o aviso de referência não encontrada na mesma camada do balão de versículo (110), para aparecer acima da tela cheia nas duas telas (aba Esboços e visualização do painel).
2. Aplicar ao aviso as mesmas proteções do balão de versículo: não fechar sozinho com toques/rolagem ao redor, fechar com Esc e com um toque no próprio botão da referência.
3. Garantir que, ao tocar na sugestão de livro, o balão do versículo abra normalmente por cima da tela cheia.

## Verificação

- Abrir uma nota com referência errada (ex.: "Joõa 3:16") no modo esboço, na tela cheia da aba Esboços e na tela cheia do painel; tocar e confirmar que o aviso aparece com a sugestão.
- Tocar na sugestão e confirmar que o texto bíblico abre.
- Conferir que o balão de versículo normal, a inserção no esboço e o cronômetro continuam iguais.

## Detalhes técnicos

- `src/components/bible/UnknownRefPopover.tsx`: `PopoverContent` recebe `z-[110]`, `onPointerDownOutside`/`onInteractOutside`/`onFocusOutside` com `preventDefault()` e `onEscapeKeyDown` fechando explicitamente; o toque no gatilho alterna aberto/fechado.
- Nenhuma alteração em `rich-content.tsx`, `bible-refs.ts`, banco ou sincronização.
