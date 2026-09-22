# Correção: versículo sugerido fecha logo após abrir

## O que acontece hoje

No aviso "Referência não encontrada", as sugestões de livro ficam dentro do próprio aviso.
Ao tocar numa sugestão, o aviso fecha — e, como o versículo foi aberto de dentro dele,
ele é removido junto e some numa fração de segundo.

## O que muda

O balão do versículo deixa de depender do aviso. Ao tocar numa sugestão:

1. o aviso fecha;
2. o versículo abre logo em seguida, ancorado na própria referência do texto;
3. o balão continua com o comportamento atual — só fecha no "X" ou com dois toques,
   inclusive em Tela Cheia.

As sugestões continuam até 3, com o mesmo cálculo de proximidade e a mesma aparência.

## Detalhes técnicos

- `src/components/bible/BibleVersePopover.tsx`: adicionar em `VerseLink` props opcionais
  `controlledOpen`/`onControlledOpenChange` (ou `autoOpen` + `renderTrigger={false}`)
  para permitir um uso sem botão visível, mantendo 100% do comportamento atual quando
  as props não são passadas.
- `src/components/bible/UnknownRefPopover.tsx`:
  - guardar `selected: {bookId, name} | null` em estado do componente;
  - os itens de sugestão viram botões simples que fazem `setSelected(s)` e `setOpen(false)`;
  - renderizar **fora** do `PopoverContent` do aviso (irmão do `Popover`) uma instância de
    `VerseLink` sem trigger visível, aberta quando `selected` existe, ancorada no mesmo
    elemento da referência; ao fechar, `setSelected(null)`;
  - remover o `onClickCapture` que causava o desmonte.
- Preservar `z-[110]`, `onEscapeKeyDown` e as proteções de foco/interação já existentes.
- Sem mudanças em `bible-refs.ts`, detecção por bloco, aliases ou dados salvos.

## Verificação

- `tsgo` e a suíte completa de testes (hoje 120) devem continuar passando.
- Teste no preview em Esboço, Consideração de Campo e Tela Cheia: tocar numa referência
  errada, escolher uma sugestão e confirmar que o versículo permanece aberto.
