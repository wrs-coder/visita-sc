## Problema

A importação reporta `books=66/66 verses=31956 missing=0`, mas ao abrir um link tipo `Cl 3:14`, `1Pe 2:9` ou `1Jo 4:8` o popover mostra "não encontrado". Já outros livros como Mateus ou Salmos funcionam.

## Causa raiz

Em EPUBs onde **um único arquivo XHTML contém vários capítulos** (típico de epístolas curtas: Colossenses, 1/2 Pedro, 1/2/3 João, Tito, Filemom, Judas), o parser hoje só atualiza `currentChapter` quando encontra um elemento com `class="chapter"`/`class="capítulo"` ou `id="chapter-N"`. Se a Bíblia usa apenas um `<h2>3</h2>`, um `<p class="cap">3</p>`, ou um `<span>Capítulo 3</span>` sem essas classes específicas, todos os versículos são gravados como `chapter=1`. O passo de deduplicação por `chap:verse` então **descarta** versículos 1, 2, 3… dos capítulos 2 em diante (mantém apenas o mais longo). Resultado: só sobra ~1 capítulo do livro e a citação `Cl 3:14` não acha nada.

A heurística `overrideChapter` em `parseEpub` (linha 738) confirma o problema mas não resolve: ela detecta "1 arquivo = vários capítulos" só se TODOS os versos extraídos ficarem no mesmo número, e quando isso acontece ela apenas usa `fallback` (que é 1) — mantendo o bug.

## Plano

Editar apenas `src/lib/epub-bible-parser.ts`:

1. **Ampliar `isChapterHeadingEl`**: reconhecer também
   - `<h1>`/`<h2>`/`<h3>` cujo `textContent` é só um número 1–150 (padrão "3"), com fonte grande/negrito implícito pela tag;
   - elementos com `epub:type` contendo `chapter`;
   - classes adicionais comuns: `c`, `ch`, `chapno`, `chapter-number`, `chap-num`, `cn`.

2. **Atualizar `extractVersesFromDoc`** para tratar essas headings como troca de capítulo (extrair o número via `id`, `data-chapter`, ou `textContent`).

3. **Auto-incremento por reset de versículo**: dentro do loop de markers, se `hit.verse === 1` e já existem markers anteriores cujo `verse > 1` (e nenhuma heading explícita foi vista entre eles), incrementar `currentChapter`. Isso cobre EPUBs sem nenhuma marcação de capítulo, apenas com `<sup>1</sup>` reiniciando.

4. **Remover o `overrideChapter` enganoso** (linhas 738-740 do `parseEpub`): agora que o capítulo é detectado corretamente dentro de `extractVersesFromDoc`, esse override que força tudo para `fallback` em arquivos multi-capítulo passa a atrapalhar.

5. **Log de diagnóstico**: imprimir `console.info("[epub-bible] book", id, "chapters=", N, "verses=", M)` por livro para futuras inspeções.

## Validação

Após o usuário reimportar o EPUB:
- Console deve mostrar `chapters` > 1 para Colossenses (4), 1 Pedro (5), 2 Pedro (3), 1 João (5), 2 João (1), 3 João (1), Tito (3), Filemom (1), Judas (1), etc.
- Total de versos deve subir (estimado ~31.100 reais, atualmente ~31.956 com duplicatas equivocadas em outros livros pode até cair levemente).
- Citações `Cl 3:14`, `1Pe 2:9`, `1Jo 4:8`, `2Pe 1:5` devem abrir o popover com o texto correto.
