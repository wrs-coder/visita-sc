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

## Análise de riscos

| Risco | Chance | Impacto | Como evitamos |
|---|---|---|---|
| Deslizar entre as páginas do painel (Agenda/Esboços/Visita/Pastoreio) esconder o cabeçalho sem querer | Média | Baixo | Só a rolagem vertical da página conta; o carrossel lateral e listas internas (menu, barra do editor) são ignorados |
| Cabeçalho "piscar" com toques curtos ou com o efeito de mola do iOS/One UI no topo | Baixa | Baixo | Mantida a margem de 8 px de movimento e "sempre visível" nos primeiros 64 px |
| Cabeçalho escondido ao abrir o teclado em formulários do painel | Baixa | Médio | Ao focar um campo de texto, o cabeçalho volta e fica parado até o teclado fechar |
| Cabeçalho escondido quando se troca de tela | Baixa | Médio | Ao mudar de tela ele volta visível automaticamente |
| Mexer no corte lateral do app inteiro quebrar outras telas | Alta se mexer | Alto | Não mexemos nessa regra; só o cabeçalho passa a "ouvir" o lugar certo |
| Acesso da esposa/convidados ter o mesmo defeito | Confirmado | Baixo | O painel de convidados usa uma cópia antiga com o mesmo problema; as duas passam a usar a mesma versão corrigida |
| Leitura da Bíblia, esboço em tela cheia, tela cheia (barra de hora oculta), salvar/exportar | Nenhuma | — | Não são alterados |
| Perder rascunhos ou dados | Nenhuma | — | Só aparência; nada é salvo nem apagado |

Padrão visual: igual ao Safari/Ajustes do iOS e à área de leitura da One UI — some ao descer, volta ao subir pouco, sempre visível no topo, sem atrasar o toque.
