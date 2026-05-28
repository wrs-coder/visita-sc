## Goal

Permitir citar livros de **um único capítulo** sem digitar o capítulo. Hoje o usuário precisa escrever `Judas 1:5`; depois desta mudança, `Judas 5` (ou `Jd 5`, `Judas 5-7`) também abrirá o versículo. A forma antiga (`Judas 1:5`) continua funcionando.

Livros afetados (5):
- **Obadias** (B31)
- **Filêmon** (B57)
- **2 João** (B63)
- **3 João** (B64)
- **Judas** (B65)

## Mudanças

Tudo em **`src/lib/bible-refs.ts`** — apenas detecção/parsing de citações. Sem alterar parser EPUB, popover, ou armazenamento.

### 1. Marcar livros de capítulo único
Adicionar constante:
```ts
const SINGLE_CHAPTER_BOOK_IDS = new Set(["B31", "B57", "B63", "B64", "B65"]);
```

### 2. Em `compile(books)` — adicionar 2 novas branches no regex
Hoje há 2 branches (`longParts` e `shortParts`), todas exigindo `chapter:verse`. Vamos separar os termos de livros de capítulo único e gerar 2 branches extras que aceitam apenas `verse` (sem `:`):

- `longSingleParts` → `(?:nome)\.?\s*(\d{1,3})(?:[-–](\d{1,3}))?` (sem `:`)
- `shortSingleParts` → `(?:abrev)(?:\.\s*|\s+)(\d{1,3})(?:[-–](\d{1,3}))?`

Importante: os mesmos termos **continuam também** nas branches `longParts`/`shortParts` originais (com `chapter:verse`), para preservar `Judas 1:5`.

Ordem das alternativas no regex: colocar as branches `chapter:verse` **antes** das `verse-only` para que `Judas 1:5` case primeiro como `cap:vers` e não como `livro 1` + lixo.

### 3. Ajustar `dissect(raw)`
Hoje exige `\d+:\d+`. Atualizar para também aceitar `nome \d+(-\d+)?` (sem `:`); nesse caso retorna `chapter: 1`, `verse: N`.

Pseudo:
```ts
// tenta cap:vers primeiro
const m1 = raw.match(/^(.+?)\.?\s*(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?$/);
if (m1) return { bookTerm, chapter, verse, verseEnd };
// fallback: nome + verso(s) — somente válido se livro de capítulo único
const m2 = raw.match(/^(.+?)\.?\s*(\d{1,3})(?:[-–](\d{1,3}))?$/);
if (m2) return { bookTerm, chapter: 1, verse, verseEnd };
return null;
```

### 4. Em `findCitations`, validar contexto do fallback
Quando `dissect` devolver chapter=1 vindo da forma sem `:`, **rejeitar** se o `bookId` resolvido não estiver em `SINGLE_CHAPTER_BOOK_IDS`. Isso evita que `Mateus 5` (sem capítulo) vire indevidamente `Mt 1:5`.

Implementação: o `dissect` pode devolver um flag `noColon: boolean`; `findCitations` descarta matches com `noColon && !SINGLE_CHAPTER_BOOK_IDS.has(info.bookId)`.

## Validação

Após o build, no campo de Considerações de Campo:
- `Judas 5` → abre Jd 1:5 ✅
- `Jd 5-7` → abre Jd 1:5-7 ✅
- `2 João 4` → abre 2Jo 1:4 ✅
- `3 Jo 8` → abre 3Jo 1:8 ✅
- `Filêmon 6` → abre Fm 1:6 ✅
- `Obadias 15` → abre Ob 1:15 ✅
- `Judas 1:5` (forma antiga) → continua funcionando ✅
- `Mateus 5` → **não** deve virar popover (Mateus tem múltiplos capítulos) ✅
- `Mt 5:9` (multi-cap normal) → continua funcionando ✅
