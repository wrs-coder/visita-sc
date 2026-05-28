## Objetivo

Recuperar os versículos faltantes (déficit concentrado em Salmos, Jeremias, Isaías, Ezequiel, Números) e blindar o parser contra o "Conteúdo do livro" sem amputar capítulos reais.

Arquivo único: `src/lib/epub-bible-parser.ts`.

## Diagnóstico

1. **Truncagem complexa**: a `truncatePreChapterContent` atual tenta vários seletores (`[id^="chapter"]`, `[id^="cap"]`, `[epub:type]`, `section[role="doc-chapter"]`) com guardas de rollback. Em livros poéticos o seletor genérico engata em âncoras fora do "ch1" e corta versículos legítimos.
2. **Travessia de versos**: o `textBetween` atual usa TreeWalker entre `marker[i]` e `marker[i+1]`. Funciona para prosa, mas qualquer falha no encadeamento (marker pulado, irmãos profundos) compromete a captura.
3. **Causa raiz dos déficits em poesia/listas**: `NOISY_CLASS_RE` inclui `sb|sb1|sb2|ss|boxStudy|box|box1|box2`. Na TNM/NWT, blocos de estrofe e listas costumam usar classes `sb`/`sb1`/`sb2` (strophe-block) — o filtro está descartando o próprio texto bíblico em Salmos, Provérbios, Jeremias, Isaías, Ezequiel. Isso explica a defasagem massiva nesses livros.

## Mudanças

### 1. `truncatePreChapterContent` — reescrita estrita

Substituir as linhas 534–601 por uma função enxuta. Âncora ÚNICA: `[id="chapter1"]` ou `.w_ch` cujo texto seja exatamente `"1"`. Se nenhuma existir, **no-op** (sem rollback, sem snapshot). Sem fallback por `verse`, sem busca por `cap`, `epub:type` ou `role`.

### 2. `textBetween` — Read-Until-Next-Anchor reforçado

Manter o TreeWalker, mas tornar as condições de parada explícitas e independentes da igualdade com `end`:

- Para no `end` (next marker) — comportamento atual.
- **NOVO**: para também ao encontrar qualquer elemento com `id` casando `/^chapter\d+[_-]?verse\d+/i` que não seja o próprio `start` (âncora de verso "órfã" não listada como marker).
- **NOVO**: para também em `.w_ch` ou `[id^="chapter"]` que não seja id de versículo (novo capítulo).
- Continua pulando subárvores `isNoisyElement` / `outlineRoots` / `isChapterHeadingEl`.

Isso garante que, ao concatenar texto entre duas âncoras `chapterX_verseY`, capturamos todos os `<p class="sl">`, `<p class="sb">` e demais nós irmãos sequenciais até esbarrar na próxima âncora real — sem depender de cadeia de markers perfeita.

### 3. `NOISY_CLASS_RE` — remover classes de poesia/estrofe

Atual:
```ts
/\b(fn|footnote|footnotes|note|notes|rearnote|annotation|xref|cross|crossref|study|caption|figcaption|byline|callout|sidebar|outline|chapterOutline|chapter-outline|synopsis|summary|ss|sb|sb1|sb2|boxStudy|box|box1|box2|bridgehead)\b/i
```

Novo (remove `ss|sb|sb1|sb2|boxStudy|box|box1|box2` — esses contêm texto bíblico em livros poéticos):
```ts
/\b(fn|footnote|footnotes|note|notes|rearnote|annotation|xref|cross|crossref|study|caption|figcaption|byline|callout|sidebar|outline|chapterOutline|chapter-outline|synopsis|summary|bridgehead)\b/i
```

Notas de rodapé, sidebars e cross-refs continuam filtrados via `PURGE_SELECTORS` (que já remove `[epub:type~="footnote"]`, `.footnote`, `aside`, `nav` etc.) — não há regressão de "Conteúdo do livro".

### 4. Mantidos sem mudança

- `hardPurgeDoc` e `PURGE_SELECTORS` (footnotes, navegação, capa).
- `looksLikeOutlinePage` (descarte de páginas-índice sem marcadores reais).
- Loop de `parseEpub`, dedup `marker > fallback`, auditoria `perBookCounts` + `diffs`.
- `bible-refs.ts`, `bible-canon.ts`, `BibleVersePopover.tsx`.

## Validação

1. `bunx vitest run` — 54/54 verdes (Judas 5, Filêmon 6, 2/3 João, Obadias).
2. Re-importar o EPUB com console aberto e capturar:
   - `[epub-bible] AUDIT perBookCounts`
   - `console.table(diffs.slice(0, 25))`
3. Comparar total geral com baseline canônica (~31.102) e reportar livros ainda defasados.

## Risco

Baixo. Truncagem fica estritamente mais conservadora. Read-Until-Next-Anchor é estritamente aditivo (só adiciona pontos de parada — não estende a janela). A remoção de `sb/sb1/sb2/ss/box*` do filtro de ruído é a única mudança que pode reintroduzir conteúdo: se algum livro voltar a vazar texto de boxes de estudo, aparecerá nos logs de auditoria como excesso (e não defasagem), e tratamos via `PURGE_SELECTORS`.

## Observação

Os números só refletem após **re-importar o EPUB** (IndexedDB não re-processa automaticamente).
