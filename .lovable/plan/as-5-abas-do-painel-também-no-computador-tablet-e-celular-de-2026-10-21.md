# As 5 abas do painel também no computador, tablet e celular deitado

Sim, é possível. Hoje, em telas largas, o painel mostra todos os cartões empilhados num único "rolo" longo. Depois da mudança, o seletor **Hoje · Esboços · Visita · Pastoreio · Amanhã** passa a aparecer em qualquer tamanho de tela.

## O que muda
- **Seletor de abas em todas as telas**: no computador, no iPad/tablet (em pé ou deitado) e no celular deitado.
- **Troca de tela**:
  - no tablet e no celular: tocar na aba ou deslizar o dedo para o lado, como no celular em pé;
  - no computador: clicar na aba ou usar as setas ← → do teclado quando o seletor estiver selecionado. O deslize lateral do touchpad também funciona.
- **Uso melhor do espaço em telas largas**: a partir da largura de um tablet deitado ou de um computador, os cartões de cada tela ficam em **duas colunas**. Isso evita cartões esticados de ponta a ponta. Em telas mais estreitas, ficam em uma coluna só.
- O seletor continua preso no topo ao rolar a página. O ponto de "recados não lidos" na aba Hoje continua igual.
- O app continua lembrando, em cada aparelho, a última tela aberta.

## O que não muda
Os cartões e o conteúdo deles, os dados, o login, a sincronização, o modo offline e as regras de quais abas aparecem. "Visita" e "Pastoreio" só aparecem quando há visita ativa, e "Esboços" só aparece para o superintendente.

## Detalhes técnicos
- `DashboardPager.tsx`: remove o early-return `if (!isMobile)`, para que pager e tablist sejam renderizados em todas as larguras. O trecho que hoje depende de `isMobile` (lazy-mount, restore, snap, altura) passa a valer sempre. A largura do track continua sendo `clientWidth`, então o snap e o `ResizeObserver` já cobrem a rotação e o redimensionamento da janela.
- Adiciona navegação por teclado no tablist (ArrowLeft/ArrowRight/Home/End, com `tabIndex` roving), seguindo o padrão ARIA de tabs.
- O conteúdo de cada `section` usa `md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:items-start` a partir de `lg`/`md`. A margem lateral do track se ajusta (`-mx-4` só no celular).
- `use-mobile` deixa de ser usado pelo pager. A primeira renderização fica igual entre servidor e navegador, o que também elimina o "pisca" do layout empilhado.
- Atualizar a regra em `AGENTS.md` sobre o pager, que hoje diz "from md up all render stacked", e a memória do layout do Dashboard.
- Validar com tsgo, vitest e Playwright em 393x733, 733x393 (celular deitado), 820x1180, 1180x820 e 1280x1800: abas visíveis, clique, deslize e teclado.
