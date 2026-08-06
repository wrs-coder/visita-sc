# Manter a formatação do texto no "modo esboço" e "tela cheia"

## O que está acontecendo

O editor (modo edição) mostra o texto com toda a formatação do Tiptap, mas as telas de leitura ("modo esboço" e "tela cheia") usam um renderizador próprio (`src/lib/rich-content.tsx`) que higieniza o HTML antes de exibir. Hoje esse higienizador:

- aceita apenas as tags `p, br, ul, ol, li, strong, em, u, b, i, h2, h3, span, mark` — tudo o mais (tabela, citação/blockquote, código, linha divisória, lista de tarefas, links, sub/sup) é desmontado e vira texto corrido;
- remove **todos** os atributos, inclusive `data-type` e alinhamento;
- dos estilos inline, só preserva `color` e `background-color`. Por isso **recuo de margem, espaçamento entre parágrafos, tamanho de fonte, alinhamento e entrelinha desaparecem**.

## O que será feito

1. Ampliar a lista de estilos preservados no renderizador para os mesmos que o editor produz: `text-indent`, `margin-left`/`margin-right`, `padding-left`, `margin-top`/`margin-bottom`, `line-height`, `font-size`, `text-align`, `font-weight`, `font-style`, `font-family` — com validação de valor (números + unidades seguras, palavras-chave conhecidas), mantendo o bloqueio a `url()`, `expression`, etc.
2. Ampliar a lista de tags aceitas para cobrir o que a barra de ferramentas gera: `H1`, `BLOCKQUOTE`, `PRE`, `CODE`, `HR`, `TABLE/THEAD/TBODY/TR/TD/TH`, `SUB`, `SUP`, `A`, `S`/`DEL`.
3. Preservar os atributos estruturais necessários: `data-type` (lista de tarefas), `data-checked`, `colspan`/`rowspan`, `style` e `href` (apenas `http`, `https` e `mailto`, com `rel="noopener noreferrer"`).
4. Aplicar no renderizador exatamente as mesmas classes visuais que o editor usa (mesmos espaçamentos de parágrafo, títulos, listas, tabela, citação, código, divisória), extraindo essa lista para um único lugar compartilhado entre `RichNoteEditor` e `RichOutlineContent`, para que os dois nunca mais divirjam.
5. Verificar visualmente uma nota com recuo, espaçamento, alinhamento, lista, tabela e citação nos três modos (edição, esboço, tela cheia).

## Segurança e compatibilidade

- A higienização continua sendo por lista de permissões; nada de `script`, `iframe`, `on*`, `javascript:` ou `style` com URL passa.
- Nenhuma mudança em como as notas são salvas, sincronizadas ou exportadas — só na exibição. Notas antigas em texto puro continuam pelo mesmo caminho atual.
- Os popups de citação bíblica (VerseLink) continuam funcionando, pois o percurso dos nós de texto é preservado.

## Arquivos afetados

- `src/lib/rich-content.tsx` (principal)
- `src/components/notes/RichNoteEditor.tsx` (passa a importar as classes compartilhadas)
