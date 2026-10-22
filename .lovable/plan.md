# Interruptor de modo escuro no painel da esposa

## O que ela vai ver
- **No topo azul do painel**, um botão redondo com ícone de lua ou sol, ao lado de "Sair". Um toque liga ou desliga o modo escuro. Ele aparece em todas as seções: Semana da Visita, Anotações e Estudo Pessoal.
- **Na gaveta de configurações** (ícone de engrenagem), uma linha "Aparência" com o mesmo interruptor do superintendente:
  - **Modo escuro**: liga e desliga.
  - **Preto puro**: só fica disponível com o modo escuro ligado.
- A escolha fica guardada no aparelho e vale em todas as telas, inclusive na tela cheia de leitura e na escrita.

## O que não muda
- O interruptor do superintendente, as cores e o banco de dados ficam como estão.

## Detalhes técnicos
- Reutilizar `ThemeToggle` (`src/components/ThemeToggle.tsx`), que já usa `useTheme` e `getOled`/`setOled`. Não criar uma lógica de tema nova.
- `visitante.painel.tsx`: adicionar no cabeçalho, antes do botão Sair, um botão-ícone (`Moon`/`Sun`) com `useTheme`, `aria-pressed` e um rótulo acessível. Usar as mesmas classes dos botões vizinhos.
- `GuestWorkspace.tsx`, `WorkspaceSheet`: nova seção "Aparência" com `<ThemeToggle />`, na variante padrão com rótulo e "Preto puro".
