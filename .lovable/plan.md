## Garantir que o versículo 1 capture todo o texto após `id="chapter N_verse1"`

### Diagnóstico

Mesmo após a correção anterior, o versículo 1 segue sumindo em alguns capítulos. A causa é que o ramo "chapter heading" na coleta de marcadores (linhas 822-845) só registra o verso 1 quando o **próprio elemento** de heading carrega o atributo `id="chapter N_verse1"`. Na TNM o id pode estar:

- num elemento sem classe `w_ch` (ex.: `<span id="chapter  1_verse1">`),
- ou no heading `w_ch` (já coberto pela correção anterior),
- ou num âncora vazio (`<a id="chapter  1_verse1"></a>`) imediatamente antes do texto.

Adicionalmente, `textBetween` (linha 703) tem uma "Parada 3" que quebra ao encontrar qualquer `isChapterAnchorEl`/`isChapterHeadingEl` — sem guarda contra descendentes do `start`. Quando o marker do versículo 1 é o próprio bloco de capítulo (`<p class="w_ch" id="chapter  N_verse1">`), um descendente com `w_ch` (ex.: span interno do número) dispara a parada e o texto sai vazio. Após o strip do "1" inicial (linha 901), `text.length < 2` cai no `continue` (linha 903) e o versículo 1 nunca é emitido.

### Mudanças em `src/lib/epub-bible-parser.ts`

#### 1. Pré-pass garantido de verso 1 (em `extractVersesFromDoc`, antes do loop de marcadores em ~822)

Após `truncatePreChapterContent(doc)` e antes do `for (const el of allEls)`, escanear:

```ts
const verse1Anchors = new Map<Element, { chap: number; verse: number }>();
const allWithId = doc.querySelectorAll<HTMLElement>('[id^="chapter"]');
allWithId.forEach((el) => {
  const parsed = parseChapVerseFromAttr(el.getAttribute("id") ?? "");
  if (parsed.verse === 1 && parsed.chap) {
    verse1Anchors.set(el, { chap: parsed.chap, verse: 1 });
  }
});
```

No loop principal, antes do `isChapterHeadingEl(el)`, se `verse1Anchors.has(el)`, empurrar marker e seguir (sem `continue` que descarte). Garante a inserção do marker de v1 independente da classificação posterior.

#### 2. Guarda em `textBetween` (linha 703)

Adicionar a mesma proteção que já existe na Parada 2 (linha 699):

```ts
if (
  (isChapterAnchorEl(el) || isChapterHeadingEl(el)) &&
  el !== start &&
  !(start.nodeType === 1 && (start as Element).contains(el))
) {
  break;
}
```

Isso impede que descendentes do próprio `start` (quando ele é o bloco de capítulo) abortem a coleta.

#### 3. Relaxar `parseChapVerseFromAttr` para id-só-de-capítulo (linha 392)

Adicionar antes do `m5` (verso isolado):

```ts
const m4b = raw.match(/^chapter[\s_-]*(\d+)$/i);
if (m4b) return { chap: parseInt(m4b[1], 10) };
```

Sem efeito sobre versos; só ajuda quando o id é `chapter N` puro.

### Preservações (intocados)

- `PURGE_SELECTORS` (linha 506) — `.groupFootnote` continua sendo purgado em `hardPurgeDoc` antes da extração. **Sem alteração.**
- Lógica de coleta do último versículo do capítulo (linhas 889-914), incluindo o `next = null` deliberado para o último marker, **intocada** — sem regressão no último versículo.
- `truncatePreChapterContent`, `isVerseMarker`, `NOISY_CLASS_RE`, `textBetween` (exceto a guarda do ponto 2), `isChapterHeadingEl`, `chapterNumberFromHeading` — todos preservados.
- Sem mudanças em CSS, rotas, componentes ou UI.

### Verificação

- `bunx vitest run` — 54/54 testes devem continuar passando.
- Reimportar a TNM em **Gerenciar Bíblias** e conferir que o versículo 1 aparece em todos os 1189 capítulos, sem quebrar o último versículo de cada capítulo.

### Fora de escopo

Qualquer alteração em purge de rodapés, parsing de OPF, agrupamento por livro, ou camada de UI.