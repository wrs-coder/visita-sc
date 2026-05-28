## Objetivo
Consolidar uma rotina universal de **Hard DOM Purge** + **truncamento do pré-conteúdo** em `src/lib/epub-bible-parser.ts`, e adicionar reconhecimento explícito das âncoras TNM (`w_ch`, `chapterX`, `chapterX_verseY`) — tudo baseado em **tags / ids / classes**, sem strings de idioma.

## Arquivo afetado
- `src/lib/epub-bible-parser.ts` (único)

Sem mudanças em `bible-refs.ts`, popover, IndexedDB, i18n, exports, ou nos 52 testes (todos devem continuar verdes).

## Mudanças

### 1. Novo `hardPurgeDoc(doc)` — purga estrutural universal

Executado **uma única vez** no topo de `extractVersesFromDoc`, antes de qualquer iteração.

```ts
const PURGE_SELECTORS = [
  // Cabeçalho do livro (TNM coloca o título em <header>)
  'header',

  // Notas de rodapé / referências / cross-refs (EPUB 3 + variantes)
  'aside[epub\\:type~="footnote"]',
  'aside[epub\\:type~="rearnote"]',
  'aside[epub\\:type~="note"]',
  'div[epub\\:type~="footnote"]',
  'div[epub\\:type~="rearnote"]',
  '[epub\\:type~="note"]',
  '[epub\\:type~="noteref"]',
  '[epub\\:type~="note-ref"]',
  '[role="doc-footnote"]',
  '[role="doc-endnote"]',
  '[role="doc-noteref"]',
  '.footnote', '.footnotes', '.footnoteref', '.fn', '.rearnote', '.endnote',
  'a[href*="#footnotesource"]',
  'a[href*="#footnote"]', 'a[href*="#fn"]', 'a[href*="#note"]', 'a[href*="#xref"]',

  // Navegação / TOC / réguas de botões
  'nav', 'nav[epub\\:type~="toc"]', 'nav[epub\\:type~="landmarks"]',
  '[epub\\:type~="toc"]', '[role="doc-toc"]', '[role="navigation"]',
  'table.w_navigation', 'p.w_navigation', '.w_navigation',
  '.nav', '.navigation', '.nav-bar', '.navbar', '.pageNav', '.page-nav',

  // Frente do livro (capa/colofão/título)
  '[epub\\:type~="titlepage"]',
  '[epub\\:type~="halftitlepage"]',
  '[epub\\:type~="frontmatter"]',
  '[epub\\:type~="colophon"]',
  '[epub\\:type~="copyright-page"]',
  '[epub\\:type~="bridgehead"]',
];

function hardPurgeDoc(doc: Document): void {
  for (const sel of PURGE_SELECTORS) {
    let nodes: NodeListOf<Element>;
    try { nodes = doc.querySelectorAll(sel); } catch { continue; }
    nodes.forEach((n) => n.remove());
  }
}
```

`try/catch` por seletor evita que um seletor não suportado pelo parser XHTML derrube a limpeza inteira.

### 2. Novo `truncatePreChapterContent(doc)` — descarta o sumário

Depois do purge, localiza a **primeira âncora de capítulo** (estrutural, sem texto) e remove **tudo que vier antes dela** em ordem de documento. Tudo que não tem âncora permanece intacto (fallback seguro).

Âncoras aceitas (em ordem de prioridade):
- `[id^="chapter"]` (TNM: `<span id="chapter1">`)
- `.w_ch` (TNM: `<span class="w_ch">`)
- `[id^="ch"]`, `[id^="cap"]`
- `[epub\\:type~="chapter"]`
- `section[role="doc-chapter"]`

```ts
function truncatePreChapterContent(doc: Document): void {
  const body = doc.body;
  if (!body) return;
  const anchor =
    body.querySelector('[id^="chapter"]') ||
    body.querySelector('.w_ch') ||
    body.querySelector('[id^="ch"]') ||
    body.querySelector('[id^="cap"]') ||
    body.querySelector('[epub\\:type~="chapter"]') ||
    body.querySelector('section[role="doc-chapter"]');
  if (!anchor) return;

  // Sobe da âncora até filho direto de body, removendo todos os irmãos anteriores
  // em cada nível. Conteúdo posterior nunca é tocado.
  let node: Element = anchor;
  while (node.parentElement && node.parentElement !== body) {
    let prev = node.previousElementSibling;
    while (prev) {
      const toRemove = prev;
      prev = prev.previousElementSibling;
      toRemove.remove();
    }
    node = node.parentElement;
  }
  // Último nível: irmãos diretos do body anteriores a `node`
  let prev = node.previousElementSibling;
  while (prev) {
    const toRemove = prev;
    prev = prev.previousElementSibling;
    toRemove.remove();
  }
}
```

### 3. Reconhecer `w_ch` como heading de capítulo

Em `CHAPTER_CLASS_RE` (linha 455), acrescentar `w_ch` à lista — assim `isChapterHeadingEl` reconhece o span e o número dentro do `<strong>` é tratado como **mudança de capítulo**, nunca como versículo.

Edit cirúrgico:
```ts
const CHAPTER_CLASS_RE = /\b(w_ch|chapter|cap[ií]tulo|chap|chapno|chap-?num|chapter-?num(?:ber)?|cn|ch)\b/i;
```

`chapterNumberFromHeading` já lê o número do `textContent` — pega o `<strong>X</strong>` automaticamente.

### 4. Reforçar reconhecimento da âncora `chapterX_verseY`

A função `parseChapVerseFromAttr` (linha 372) já suporta `chapter11_verse5` via `m1` — **nenhuma mudança necessária**, apenas confirmação. Quando o purge derrubar o lixo anterior, o primeiro `<span id="chapter1_verse1">` vira o marcador inicial correto.

### 5. Integração no fluxo

Em `extractVersesFromDoc` (linha 601), adicionar as duas primeiras linhas:

```ts
function extractVersesFromDoc(doc, fallbackChapter) {
  hardPurgeDoc(doc);
  truncatePreChapterContent(doc);
  // ... restante intacto: allEls, outlineRoots, loop de markers, textBetween, etc.
}
```

**Não removo** `findOutlineRoots`, `NOISY_*`, `isNoisyElement`, `isVerseMarker`, nem o fallback de regex texto-puro — continuam como segunda camada (defesa em profundidade) para EPUBs de outras editoras.

### 6. Atenção a regressão: `chapterFromHeading`

`chapterFromHeading` lê `h1/h2/h3/title` para inferir o capítulo do arquivo. Como `<header>` é purgado, se o título do livro estiver lá **dentro de um header**, ele somem — o que é o comportamento desejado. Headings de capítulo (`<h1>1</h1>`) **dentro do body normal** continuam funcionando. Sem alteração nessa função.

## Não alterado
- `bible-refs.ts`, `BibleVersePopover.tsx`, testes, IndexedDB, exports, popover, Tiptap, fullscreen, APK/PWA.
- Heurísticas de marcador (`isVerseMarker`), `findOutlineRoots`, `isNoisyElement` — tudo permanece como defesa secundária.

## Validação
- `bun test src/lib/bible-refs.test.ts` → 52/52 verdes (sem mudança no módulo).
- Build TS strict verde.
- Manual: reimportar EPUB TNM e abrir 1 Pe 1:4 → texto real; 1 Tm capítulo 1 não deve conter "A PRIMEIRA CARTA A TIMÓTEO" nem sumário.

## Risco
Baixo — operações estruturais aditivas. `truncatePreChapterContent` é no-op em EPUBs sem âncoras `chapter*`/`w_ch`, preservando o comportamento atual nos arquivos não-TNM.
