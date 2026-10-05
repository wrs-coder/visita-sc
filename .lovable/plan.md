# Recolher/expandir também no modo "Somente visualização"

## O que acontece hoje
Nas abas Estudos e Revisitas, Refeições, Transporte e Checklist da Congregação, quando a edição está desligada, a página inteira é "travada" de uma vez. Essa trava desliga todos os botões dentro dela — inclusive as setinhas de recolher/expandir, o "Recolher tudo/Expandir tudo" e, no Checklist, o toque para abrir cada item.

## O que vai mudar
- As setinhas de cada dia e de cada evento, e o botão "Recolher tudo/Expandir tudo", passam a funcionar sempre, com edição ligada ou desligada.
- No Checklist, tocar no item para abrir/fechar os detalhes funciona também em somente visualização.
- Todo o resto continua travado como hoje: campos, salvar, adicionar, excluir, marcar item como feito.
- Nada muda em dados, permissões, login, modo offline ou abertura do app.

## Detalhes técnicos
- Causa: `<fieldset disabled={!editAllowed}>` desabilita todo `<button>` descendente, incluindo `CollapseToggle`/`CollapseIdToggle`/`CollapseAllButton` e `AccordionTrigger`.
- `src/components/ui/collapsible-blocks.tsx`: os controles de recolher passam a ser `<span role="button" tabIndex={0}>` com `onClick` + `onKeyDown` (Enter/Espaço) e `aria-expanded`; `fieldset disabled` não afeta elementos que não são de formulário. Mesmo visual. Isso cobre Estudos, Refeições e Transporte (e as outras abas que já usam o componente, sem efeito colateral).
- `src/routes/_app.checklist.tsx`: mover o `fieldset disabled` para envolver só o conteúdo editável dentro de cada `AccordionContent` (e o cartão de progresso não precisa dele); o `Accordion`/`AccordionTrigger` fica fora da trava. O botão de marcar já respeita `canEdit` sozinho.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`; conferir no navegador com edição desligada.
