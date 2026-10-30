# Cabeçalho que encolhe ao rolar — correção (5.0.9)

## O que aconteceu
O recurso foi incluído no app, mas não reage no celular. O aplicativo inteiro está configurado para cortar o excesso lateral da tela, e esse ajuste faz o celular rolar a "página interna" em vez da janela. O cabeçalho estava escutando só a janela, que nunca se move — então ele nunca soube que você rolou.

Nada mais muda: o restante do painel, os cartões e as páginas deslizantes continuam iguais.

## Como vai ficar
```text
Topo do painel           Rolando para baixo       Rolando para cima
+--------------------+   +--------------------+   +--------------------+
| = Visita SC   (o)  |   | [Card Agenda    ]  |   | = Visita SC   (o)  |
|--------------------|   | [               ]  |   |--------------------|
| [Card Agenda    ]  |   | [Card Esboços   ]  |   | [Card Esboços   ]  |
| [Card Esboços   ]  |   | [               ]  |   | [               ]  |
+--------------------+   +--------------------+   +--------------------+
 cabeçalho visível        some (+~56 px)           volta na hora
```
- Perto do topo, o cabeçalho fica sempre visível.
- Com o menu lateral aberto ou em telas de foco, ele não se mexe.
- Animação suave de 200 ms, estilo iOS / One UI.

## Detalhes técnicos
- `src/lib/use-hide-on-scroll.ts`: trocar `window.addEventListener("scroll")` por `document.addEventListener("scroll", ..., { capture: true, passive: true })` e ler a posição com `Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)`. Causa: `html, body { height:100%; overflow-x:hidden }` em `src/styles.css` faz o `body` virar o contêiner de rolagem, deixando `window.scrollY` sempre 0.
- Ignorar eventos de rolagem horizontal do carrossel do painel (só considerar o alvo `document`/`body`/`html`).
- Não alterar `styles.css` (evita mexer no corte lateral do app inteiro).
- Teste: estender `v508-rules.test.ts` com a função de leitura da posição (body com scrollTop > 0 e window 0 → retorna a do body).
- Versão 5.0.9 / versionCode 38 em todos os arquivos de versão; nota curta no "O que há de novo" mantendo a edição especial.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`; conferir no navegador com tela de celular que o cabeçalho some ao rolar.
