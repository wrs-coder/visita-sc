# Três botões iguais no menu lateral: Online, Escuro e Preto puro

## O que muda
- No menu lateral (celular e computador), uma única linha com **três botões do mesmo tamanho, lado a lado**, todos no estilo do "Modo Online" (mesma altura, mesmos cantos e mesma borda):
  1. **Online / Offline**: igual a hoje. Ao tocar, abre a mesma confirmação de troca de modo.
  2. **Escuro / Claro**: um toque liga ou desliga o modo escuro, sem interruptor. Mostra a lua ou o sol e fica destacado quando ligado.
  3. **Preto puro**: um toque liga ou desliga. Fica apagado e não responde enquanto o modo escuro estiver desligado.
- Cada botão tem ícone em cima e nome curto embaixo ("Online", "Escuro", "Preto"), para os três caberem na largura do menu.
- O funcionamento não muda: as escolhas continuam guardadas no aparelho.

## Detalhes técnicos
- `ConnectionModeToggle.tsx`: nova propriedade `compact` com layout vertical (ícone + rótulo curto) e as mesmas cores atuais; o diálogo de troca continua igual.
- `ThemeToggle.tsx`: a variante `sidebar` passa a ter dois botões (`aria-pressed`) em vez de interruptores; destaque com tokens do menu lateral (`bg-sidebar-accent`); "Preto puro" fica `disabled` quando claro.
- `_app.tsx`: nos dois menus, `grid grid-cols-3 gap-2` com `<ConnectionModeToggle compact />` + os dois botões de tema.
- i18n pt/en/es para os rótulos curtos.
- Só muda a aparência do menu; dados, login e sincronização continuam iguais.
