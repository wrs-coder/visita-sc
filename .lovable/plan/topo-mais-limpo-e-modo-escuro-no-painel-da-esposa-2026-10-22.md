# Topo mais limpo e modo escuro no painel da esposa

## Como fica o topo
```text
[logo] Congregação X  v               [lua] [⋮]
```
- **Uma só linha, mais baixa.** O nome da congregação ocupa o espaço que hoje dividem os botões.
- A linha "Modo esposa • Somente leitura" deixa de ficar sempre à vista. Ela passa para dentro do menu.
- **Nome da congregação com seta (v).** Quando há mais de uma congregação, um toque no nome abre a lista para trocar e o botão "Semana atual". Hoje isso é uma segunda faixa azul sempre aberta.
- **Botão de lua ou sol:** liga e desliga o modo escuro com um toque.
- **Menu de três pontinhos (⋮)** reúne o que hoje fica espremido:
  - Compartilhar
  - Ativar modo offline
  - Aparência: Modo escuro e Preto puro, iguais aos do superintendente
  - Modo esposa • Somente leitura, só como informação
  - Sair
- **Ao rolar a tela para baixo**, o topo se esconde. Ao rolar para cima, ele volta. Assim sobra mais espaço para ler e escrever.

## Modo escuro
- É o mesmo interruptor do superintendente: Modo escuro e, com ele ligado, Preto puro.
- Fica no botão rápido do topo, no menu ⋮ e na gaveta de configurações das Anotações e do Estudo Pessoal.
- A escolha fica guardada no aparelho e vale em todas as telas.

## O que não muda
- As janelas de Compartilhar e de Modo offline são as mesmas de hoje. Só muda o lugar onde ela toca para abrir.
- A troca de congregação funciona igual, assim como a Semana da Visita, os dados e o banco de dados.

## Detalhes técnicos
- `visitante.painel.tsx`, cabeçalho:
  - `h-12`, uma linha só.
  - O `DialogTrigger` de compartilhar vira um estado `shareOpen`, que já existe, aberto pelo item do menu.
  - O offline continua usando `setOfflineOpen`.
  - `DropdownMenu` com `MoreVertical`.
  - O seletor de congregação passa para um `Popover` no nome, com o mesmo `select`, a mesma lógica `load` e o botão "Semana atual".
  - O texto de modo e somente leitura fica como item desabilitado no menu.
- Esconder ao rolar: um hook leve com `scroll` passivo e `requestAnimationFrame` aplica `-translate-y-full` quando a página desce mais de 8px e volta quando sobe. Fica sempre visível no topo da página.
- Tema: reutilizar `useTheme` e `ThemeToggle`, sem lógica nova.
  - Botão-ícone `Moon`/`Sun` com `aria-pressed`.
  - Itens do menu para Modo escuro e Preto puro.
  - `<ThemeToggle />` numa seção "Aparência" do `WorkspaceSheet`.
