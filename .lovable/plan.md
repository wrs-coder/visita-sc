## Problemas identificados

**1. Livros de 1 capítulo (Judas, Filêmon, Obadias, 2 João, 3 João)**

A regex de detecção (`bible-refs.ts`) está correta — os 52 testes incluindo `["Judas 5","B65"]`, `["Obadias 15","B31"]`, `["Filêmon 6","B57"]` continuam passando. Portanto a citação É reconhecida; o problema é que **o popover não encontra o texto do versículo no IndexedDB**, ou seja, o EPUB parser deixou de indexar esses livros corretamente após o Hard DOM Purge.

Causa provável em `epub-bible-parser.ts`:

- A função `truncatePreChapterContent` usa seletores genéricos `[id^="ch"]` e `[id^="chapter"]`. Em arquivos XHTML de livros de 1 capítulo da NWT/TNM, o **único** elemento com `id` começando em `chapter` é o próprio `<span id="chapter1_verse1">`. O `querySelector` retorna esse span de versículo como "âncora", e o algoritmo então sobe a árvore removendo todos os irmãos anteriores em cada nível — incluindo o título e, dependendo da hierarquia, o próprio bloco que contém o verso 1.
- Ainda que sobreviva o `<p>` do versículo 1, blocos de cabeçalho legítimos (que servem de `chapterFromHeading`) são removidos sem prejuízo aparente. O dano real é quando o anchor `chapter1_verse1` está aninhado dentro de um wrapper que também contém o nome do livro como irmão anterior: o wrapper inteiro é mutilado e a extração devolve `< 3` versículos, caindo no `console.warn("skip canon…")` e o livro é descartado.

**2. "Conteúdo do livro" continua aparecendo em 1 Pedro**

Na estrutura JW (TNM/NWT) o sumário do livro ("Conteúdo do livro" / "Book Outline") vive em um arquivo XHTML SEPARADO do(s) capítulo(s) reais — mesmo bucket canônico, mas arquivo diferente. Esse arquivo:

- Não tem marcadores de versículo `chapter1_verseN`, então `truncatePreChapterContent` é no-op nele.
- Tem texto narrativo com poucos blocos parentéticos no formato `(1-6)` que `findOutlineRoots` exige (≥ 2 por elemento), então a detecção atual de outline falha.
- Como `markers.length < 3`, o parser cai no **fallback regex de texto puro** (linha 745-760) e gera "pseudo-versículos" a partir do texto do sumário — esses são gravados em `verseMap` com chave `1:1`, `1:2`, etc.
- Como o `verseMap` mantém o texto mais longo por chave (`v.text.length > prev.text.length`), o sumário (texto longo, contínuo) sobrescreve o versículo real de 1 Pedro 1:4 com o índice/esboço.

## Plano de correção (cirúrgico, único arquivo)

**Arquivo único:** `src/lib/epub-bible-parser.ts` (mais 2 casos novos em `src/lib/bible-refs.test.ts` apenas para regressão de citação).

### Mudança 1 — Tornar `truncatePreChapterContent` seguro para livros de 1 capítulo

- Ignorar anchors cujo `id` contenha `verse` (ex.: `chapter1_verse1`) — esses são marcadores de versículo, não de capítulo.
- Remover o seletor genérico `[id^="ch"]` (matchava `chapter1_verse1`, `chapter-overview`, etc.) — manter apenas seletores estruturais de capítulo de verdade: `[id^="chapter"]:not([id*="verse"])`, `.w_ch`, `[id^="cap"]:not([id*="verse"])`, `[epub\\:type~="chapter"]`, `section[role="doc-chapter"]`.
- **Guarda de segurança:** se após a truncagem o `body.textContent.trim().length` cair para menos de **20%** do tamanho original (ou < 200 chars), reverter (não aplicar a truncagem). Isso protege livros pequenos / 1-capítulo onde o anchor encontrado é tardio no documento.

### Mudança 2 — Detectar e descartar páginas de "Outline / Conteúdo do livro"

Adicionar uma checagem **antes** do fallback regex de texto puro em `extractVersesFromDoc`:

- Se `markers.length < 3` E o documento tem **qualquer um** dos sinais abaixo, retornar `[]` (descartar o arquivo inteiro):
  - `findOutlineRoots(doc).size >= 1` (com `OUTLINE_PAREN_RE` relaxado para aceitar `>= 2` ocorrências em qualquer lugar do body, não só dentro do mesmo elemento).
  - Mais de 5 elementos `<a>` cujo `href` contém `#chapter` ou `_verse` (típica lista de links de um índice).
  - Nenhum elemento com `id` que case `chapter\d+_verse\d+` ou classe `w_ch`/`verse` no documento todo.

Ou seja: páginas que parecem índices/sumários **não** caem mais no fallback de texto puro — viram zero versículos e o `verseMap` do bucket fica preservado pelo arquivo de capítulos reais.

### Mudança 3 — Endurecer o fallback regex de texto puro

Mesmo que algum sumário escape das checagens acima, o fallback nunca deve sobrescrever versículos já indexados:

- Em `parseEpub` (loop de buckets, linha ~906), alterar a regra de dedup: o texto do fallback (sinalizado por nova flag opcional `source: "fallback"` retornada por `extractVersesFromDoc`) **só** é gravado se a chave `chap:verse` ainda não existir no `verseMap` — nunca sobrescreve um texto vindo de marcadores reais.

### Mudança 4 — Testes de regressão

Adicionar 2 testes em `bible-refs.test.ts` (já passam, servem de guarda contra futuras regressões na regex):

- `"Judas 5"` → bookId `B65`, chapter 1, verse 5.
- `"Filêmon 6"` → bookId `B57`, chapter 1, verse 6.

(Já existem testes semelhantes; reforçar via `it()` específicos com nomes claros não-regressão.)

## Fora de escopo (não tocar)

- `bible-refs.ts` (regex e dissect estão corretos, 52/52 testes verdes).
- `BibleVersePopover.tsx`.
- `bible-canon.ts`, IndexedDB, schema, ordering.
- Demais heurísticas do EPUB (`PURGE_SELECTORS`, `isVerseMarker`, `isChapterHeadingEl`, `findOutlineRoots` exceto o ajuste de busca global).
- Importação anterior dos usuários: as correções só entram em vigor após **re-importar o EPUB**. Aviso ao usuário no fim da execução.

## Validação

- `bunx vitest run` deve passar com 54/54 testes (52 atuais + 2 novos).
- Importar a NWT em inglês e a TNM em português; conferir nos logs `[epub-bible]`:
  - `books=66/66` (ou ≥ 64 com `missing` claro);
  - Os 5 livros de 1 capítulo presentes em `verses`;
  - 1 Pedro 1:4 retornando o texto real e não o esboço.

## Risco

Baixo. Mudanças são aditivas/restritivas:
- (1) só restringe seletores e adiciona guarda — pior caso é truncagem virar no-op (comportamento pré-Hard-Purge).
- (2) só descarta arquivos que já não iam contribuir com versículos reais.
- (3) só impede sobrescrita — nunca remove dados válidos.
