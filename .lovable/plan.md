## Correção: não quebrar em `.w_ch` inline do número do capítulo

### Diagnóstico

Na estrutura padrão TNM dos 66 livros, logo após `<span id="chapterN_verse1"></span>` vem `<span class="w_ch"><strong>N</strong> </span>` (o número do capítulo inline) e em seguida o texto do versículo 1, tudo dentro do mesmo `<p>`.

O pré-pass `verse1Anchors` (linhas 828-835) já registra o anchor de `verse1` corretamente como marker. O problema está em `textBetween` (linha 708-714): a **Parada 3** quebra ao encontrar qualquer elemento com classe `w_ch` (via `isChapterAnchorEl`). O span `.w_ch` que carrega só o número "1" é o **próximo irmão** do anchor `start`, então a guarda `!start.contains(el)` não protege. A coleta para antes mesmo de começar, o texto fica vazio, e o versículo 1 é descartado em `continue` (linha 920).

### Mudança única em `src/lib/epub-bible-parser.ts`

Em `textBetween`, na "Parada 3" (linhas 708-714), tratar o `.w_ch` que é **apenas prefixo numérico do capítulo** (id começa com `chapter` puro, sem `_verse`, OU conteúdo é só dígitos) como **subárvore a pular** — não como parada. Apenas headings de capítulo reais (`isChapterHeadingEl` em blocos `<h1>`/`<h2>`/`<p class="w_ch">` que contêm um novo número de capítulo distinto do atual) devem quebrar.

Lógica nova dentro do `if (node.nodeType === 1)`:

```ts
// Se for um span/anchor inline com classe w_ch carregando só o número do
// capítulo (prefixo do versículo 1), pula a SUBÁRVORE em vez de parar.
if (/\bw_ch\b/i.test(el.getAttribute("class") ?? "")) {
  const txt = (el.textContent ?? "").trim();
  const idAttr = el.getAttribute("id") ?? "";
  const isInlineChapterNumber =
    /^\d{1,3}$/.test(txt) ||
    (/^chapter\d+$/i.test(idAttr) && !/_verse/i.test(idAttr));
  if (isInlineChapterNumber) {
    // pula subárvore (mesma técnica usada para nós ruidosos)
    let nxt: Node | null = walker.nextSibling();
    while (!nxt) {
      const parent = walker.parentNode();
      if (!parent) break;
      nxt = walker.nextSibling();
    }
    node = nxt;
    continue;
  }
}
```

Esse bloco vai **antes** da Parada 3 atual (linha 708). Assim:
- `.w_ch` inline do número do capítulo → skip da subárvore, continua coletando texto do v1.
- `<p class="w_ch">` que abre um novo capítulo (com conteúdo além do número, ou heading com texto) → cai na Parada 3 e quebra como hoje.
- Anchors `id="chapterN"` puros (sem `_verse`) que aparecem como irmãos do v1 anchor → também tratados como skip (não param a coleta).

### Preservações (intocadas)

- **`PURGE_SELECTORS` e `hardPurgeDoc`** — `.groupFootnote` continua purgado antes da extração. **Sem alteração.**
- **Pré-pass `verse1Anchors`** (linhas 828-835) — mantido.
- **Coleta do último versículo do capítulo** (linhas 906-920, com `next = null` deliberado) — intocada. Sem regressão no último versículo.
- **Parada 1 (próximo marker), Parada 2 (anchor de verso órfão)** — intocadas.
- `parseChapVerseFromAttr`, `isVerseMarker`, `isChapterHeadingEl`, `chapterNumberFromHeading`, `truncatePreChapterContent`, `findOutlineRoots`, `isNoisyElement` — todos preservados.
- Sem mudanças em CSS, rotas, componentes, UI ou parsing de OPF.

### Verificação

- `bunx vitest run` — 54/54 testes devem continuar passando.
- Reimportar a TNM em **Gerenciar Bíblias** e conferir Gênesis 1:1, Mateus 1:1, 1 Pedro 1:1 (estrutura do exemplo), e amostragem de capítulos no meio de cada livro.
- Confirmar que o último versículo de cada capítulo continua íntegro (regressão crítica).

### Fora de escopo

Qualquer alteração em purge de rodapés, parsing de OPF, agrupamento por livro, fallback regex, ou camada de UI.
