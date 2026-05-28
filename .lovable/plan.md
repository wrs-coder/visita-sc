## Objetivo
1. Resolver aliases ambíguos (`Jo`, `Jn`, `Dn`, `Jd`, `Nm`) com base no **idioma da Bíblia EPUB importada**. Bíblia em PT → `Jo`=João; Bíblia em EN → `Jo`=Job. Sem quebrar a estrutura existente.
2. Adicionar suíte de testes automatizados para garantir regressão zero.

---

## Parte 1 — Resolução por idioma

### Por que o conflito existe
`compile()` em `bible-refs.ts` faz `for (b of books) → for (alias of [...book.aliases, ...canonAliases]) → lookup.set(key, …) se !lookup.has(key)`. Como os livros são processados em ordem canônica (Job=18 antes de João=43) e todos os aliases multilíngues do `CANON` são despejados em todos os casos, **o primeiro a registrar uma chave ambígua vence sempre** — independente do idioma da Bíblia importada.

### Estratégia
1. **Detectar idioma** da Bíblia importada (`detectBibleLanguage(books)`):
   - Examina os `displayName` dos livros.
   - Conta marcadores fortes: `joao|mateus|salmos|genese|apocalipse` → `pt`; `john|matthew|psalms|genesis|revelation` → `en`; `juan|mateo|salmos|genesis|apocalipsis` → `es` (Salmos colide com PT mas o desempate por outros marcadores resolve).
   - Retorna `"pt" | "en" | "es" | "unknown"`.

2. **Tabela `AMBIGUOUS_ALIASES`** declarando o livro preferido por idioma:
   ```ts
   const AMBIGUOUS_ALIASES: Record<string, Partial<Record<Lang, string>>> = {
     jo: { pt: "B43", en: "B18", es: "B18" }, // João vs Job
     jn: { pt: "B43", en: "B32" },            // João vs Jonas
     dn: { pt: "B27", en: "B05" },            // Daniel vs Deuteronomy
     jd: { pt: "B65", en: "B07" },            // Judas vs Judges
     nm: { pt: "B04", en: "B04" },            // Números (Nahum nunca usa)
   };
   ```
   Esses aliases continuam **presentes em ambos os livros do CANON** (não removemos nada — mantém compatibilidade com outras possíveis Bíblias).

3. **Filtro no `compile(books, lang)`**: ao iterar aliases de cada livro, se o alias normalizado for chave de `AMBIGUOUS_ALIASES` **e** o livro atual não for o preferido para `lang`, pula esse alias. Quando `lang === "unknown"`, mantém o comportamento atual (primeiro vence).

4. **Cache**: trocar o `WeakMap<BookInfo[], CompiledIndex>` por `WeakMap<BookInfo[], Map<Lang, CompiledIndex>>` para evitar recompilar quando o idioma muda. Idioma é detectado uma vez por chamada de `findCitations`/`resolveBookId`.

### Mudanças concretas em `src/lib/bible-refs.ts`
- Adicionar `type Lang = "pt" | "en" | "es" | "unknown"`.
- Adicionar `detectBibleLanguage(books)` (pode ser memoizado por referência de `books`).
- Adicionar `AMBIGUOUS_ALIASES`.
- Trocar assinatura interna de `compile(books)` para `compile(books, lang)`.
- Em `findCitations` e `resolveBookId`: chamar `const lang = detectBibleLanguage(books)` e passar para `compile`.
- Ajustar cache para chave composta (books + lang).
- Não mexer em `bible-canon.ts` — fica intocado.

---

## Parte 2 — Testes automatizados (Vitest)

### Setup
- `bun add -d vitest` (não precisa `@vitest/ui` nem jsdom — testes são puramente de função).
- Adicionar script: `"test": "vitest run"`.
- Criar `vitest.config.ts` mínimo (sem JSX, apenas Node).

### Arquivo `src/lib/bible-refs.test.ts`
Duas fixtures: `ptBooks` (66 livros com `displayName` em PT) e `enBooks` (em EN), ambas geradas a partir de listas explícitas (não usa o EPUB).

**A. Idioma detectado**
- `detectBibleLanguage(ptBooks)` === `"pt"`
- `detectBibleLanguage(enBooks)` === `"en"`

**B. Resolução PT (Bíblia em português)**
- `Jo 3:16` → João (B43)
- `Jn 1:1` → João (B43)
- `Dn 7:13` → Daniel (B27)
- `Jd 5` → Judas (B65, single-chapter)
- `Nm 6:24` → Números (B04)

**C. Resolução EN (Bíblia em inglês)**
- `Jo 1:1` → Job (B18)
- `Jn 1:1` → Jonah (B32)
- `Dn 7:13` → Deuteronomy (B05)
- `Jd 5` → Judges (B07)
- `Jude 5` → Jude (B65)

**D. Acentuação PT**
- `João 2:1`, `joao 2:1`, `JOÃO 2:1` → todos resolvem João 2:1
- `Colossenses 3:14`, `colossenses 3:14`
- `Filêmon 6`, `filemon 6`

**E. Livros numerados**
- `1 João 4:8`, `I João 4:8`, `1Jo 4:8`, `1 Jo 4:8`
- `2 Pedro 3:10`, `2Pe 3:10`
- `1Co 13:4`, `1 Co 13:4`

**F. Livros de capítulo único (verso-only)**
- `Judas 5` → Jude 1:5
- `2 João 4` → 2 John 1:4
- `3 Jo 8` → 3 John 1:8
- `Obadias 15` → Obadiah 1:15
- `Filêmon 6` → Philemon 1:6
- **negativo:** `Mateus 5` (sem `:`) → não casa

**G. Bordas com pontuação**
- `(João 2:1)` casa
- `João 2:1,` casa
- `... João 2:1. Próxima` casa
- `abcJoão 2:1` não casa

**H. Intervalos**
- `João 3:16-18`, `João 3:16–18` (en-dash), `Jd 5-7`

**I. Forma antiga preservada**
- `Judas 1:5` → Jude 1:5 (mesmo em Bíblia PT)

**J. Múltiplas citações**
- `Veja Mt 5:9 e Jo 14:6.` → 2 matches em ordem, ambos resolvidos para o livro correto em PT.

Total: ~30 asserções organizadas em `describe` por categoria.

### Validação
- `bun run test` deve passar 100%.
- Verificar manualmente no app que `Jo 3:16` agora abre João (com EPUB PT importado).

---

## Fora de escopo
- Não tocar em `bible-canon.ts` (aliases ficam como estão).
- Não tocar em `BibleVersePopover.tsx`, parser EPUB, ou armazenamento.
