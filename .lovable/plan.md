## Objetivo

1. Adicionar uma auditoria por livro que imprime quantos versículos foram extraídos por bookId (ex.: `{ B01: 1533, B02: 1213, ... }`) e qual a defasagem vs. o canônico esperado.
2. Identificar e corrigir o(s) falso(s) positivo(s) que está(ão) descartando capítulos reais (sintomas: 1 Pedro 1 e 2 Pedro 1 ausentes; perda de ~865 versículos no total).

Arquivo único: `src/lib/epub-bible-parser.ts`.

## Diagnóstico inicial (do código atual)

Olhando `looksLikeOutlinePage` (linhas 718–745) e `truncatePreChapterContent`, há três gatilhos plausíveis para falso positivo:

- **Regra "≥ 3 parênteses (N) ou (N-M)"** (linha 738-739): páginas de capítulo único em livros poéticos (Salmos, Provérbios) e referências cruzadas embutidas no texto frequentemente contêm 3+ parentéticos numéricos legítimos. Disparo → descarta o arquivo inteiro.
- **Regra "> 5 links com `#chapter|_verse|#v\d`"** (linha 728-734): o primeiro arquivo de cada livro na NWT/TNM costuma trazer um pequeno sumário interno com links para os próprios versículos do livro. Em 1 Pedro / 2 Pedro o primeiro arquivo (= capítulo 1) é a página combinada "outline + texto do cap. 1"; com mais de 5 links ele é classificado como outline e descartado por inteiro — explica exatamente "cap. 1 some, cap. 2 fica".
- **Guarda de 80% em `truncatePreChapterContent`**: se acionada e revertida, o cabeçalho/sumário volta ao DOM e empurra `markers.length` para baixo de 3, caindo na branch de outline.

A regra "`hasRealVerseAnchors` → não é outline" deveria ter blindado os arquivos com âncoras reais `chapter1_verseN`, mas o seletor `[id^="chapter"][id*="verse"]` pode estar falhando em XHTML (case-sensitive em `getElementsByTagName`/`querySelector` com namespaces) — vale revalidar.

## Mudanças propostas

### 1. Auditoria por livro (novo log, sem mudança de comportamento)

Em `parseEpub`, logo após o loop que preenche `verses` (antes do `console.info("DONE …")`), montar:

```ts
const perBookCounts: Record<string, number> = {};
for (const v of verses) {
  perBookCounts[v.bookId] = (perBookCounts[v.bookId] ?? 0) + 1;
}
// Defasagem vs. canônico esperado
const expected: Record<string, number> = { /* totais do CANON */ };
const diffs = CANON
  .map((c) => ({ id: c.id, name: c.english, got: perBookCounts[c.id] ?? 0, exp: expected[c.id] ?? 0 }))
  .filter((r) => r.exp > 0 && r.got < r.exp)
  .sort((a, b) => (b.exp - b.got) - (a.exp - a.got));
console.table(perBookCounts);
console.table(diffs.slice(0, 20));
```

(Os 66 totais canônicos ficam num `const EXPECTED_VERSE_COUNTS` no topo do arquivo — números do texto massorético/grego padrão; servem apenas para destacar defasagens grosseiras, não como verdade absoluta.)

### 2. Tornar `looksLikeOutlinePage` mais conservador

Para evitar descartar arquivos legítimos:

- **Remover a regra "≥ 3 parênteses"** isolada. Em vez disso, exigir AMBOS: muitos parentéticos **E** zero marcadores de versículo no documento.
- **Elevar o threshold de navLinks** de 5 → 15, e exigir adicionalmente `markers.length === 0` no doc (a checagem fica depois da coleta de markers, ou usa um pré-scan rápido por `chapter\d+_verse\d+` IDs).
- **Critério unificado**: o arquivo só é classificado como outline se TODAS as condições abaixo forem verdadeiras:
  1. Nenhum elemento com `id` matching `/chapter\d+_verse\d+/i`.
  2. Nenhum elemento com classe `w_ch` / `verseNum` / `verse-num`.
  3. (`navLinks ≥ 15`) OU (`findOutlineRoots(doc).size ≥ 2`).

Isso elimina o caso "primeiro arquivo de 1 Pedro tem 6 links de navegação + texto real do cap. 1".

### 3. Reforçar a guarda de `truncatePreChapterContent`

- Mudar o threshold de 80% → 50% (preservar truncagem mais agressiva quando o sumário é grande), MAS adicionar segunda guarda: se após a truncagem nenhum elemento com `id` matching `chapter\d+_verse\d+` permanecer no body, reverter.

### 4. Não-mudanças

- `bible-refs.ts`, `bible-canon.ts`, `BibleVersePopover.tsx` — intocados.
- `PURGE_SELECTORS`, `isVerseMarker`, `isChapterHeadingEl` — intocados.

## Validação

1. `bunx vitest run` — 54/54 devem continuar verdes.
2. Pedir ao usuário que **re-importe o EPUB** com o console aberto e cole:
   - A tabela `perBookCounts`.
   - A tabela `diffs` (top 20 livros com maior defasagem).
   - Linhas `[epub-bible] skip canon …` se houver.

Com esses números isolamos exatamente quais livros perderam versículos e em qual ordem de magnitude antes de qualquer próxima mudança de regra.

## Risco

Baixo. (1) é log puro. (2) e (3) só **afrouxam** as condições de descarte — pior caso volta ao comportamento pré-correção do "Conteúdo do livro" em arquivos muito específicos, que então será visível no log de auditoria e tratado em seguida.

## Observação ao usuário

As novas contagens só aparecem após **re-importar o EPUB** — o IndexedDB existente não é re-processado automaticamente.
