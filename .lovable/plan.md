# Sub-etapa 3.1 — Fundação (store + parser, sem mexer na UI)

Objetivo: preparar toda a camada de dados para Bíblias importadas via EPUB **sem quebrar nenhum import existente**. A UI (`BibleManagerDialog`, `BibleVersePopover`, `_app.consideracoes-campo.tsx`) continua usando a API antiga via *stubs* até as sub-etapas 3.2 e 3.3.

## O que será feito

### 1. Dependência
- `bun add jszip` (única nova dependência; o parser usa `DOMParser` nativo).

### 2. Novo arquivo: `src/lib/epub-bible-parser.ts`
Parser puro, sem efeitos colaterais. Responsável por ler um `File` EPUB e devolver `{ meta, books, verses }`.

Resiliência em cascata (cada etapa tem fallback):
- **Descompactação**: `JSZip.loadAsync(file)` direto da memória, sem gravar em disco.
- **Localizar OPF**: lê `META-INF/container.xml` → `rootfile@full-path`; fallback: primeiro `*.opf` encontrado.
- **Metadados** (`dc:language`, `dc:title`, `dc:identifier`): parse com `DOMParser` em `application/xml`. `lang` normalizado para ISO-639-1 (`pt-BR` → `pt`).
- **Mapeamento de livros**:
  1. Tenta `nav.xhtml` com `epub:type="toc"` → extrai `<a>` (ordem + nome de exibição).
  2. Fallback: `toc.ncx` → `navPoint/navLabel/text`.
  3. Fallback final: ordem do `<spine>` no OPF, usando `<title>` ou primeiro `<h1>/<h2>` de cada xhtml.
- **IDs estáveis**: atribuição sequencial `B01`, `B02`, … na ordem de leitura. **`B01` será sempre o primeiro livro do EPUB**, independente da revisão TNM/idioma.
- **Aliases automáticos**: a partir do `displayName`, gera variantes (primeiras 3 letras sem acento, com/sem ponto, número romano + nome para "1 Coríntios", etc.). Usuário pode importar EPUBs em qualquer idioma e o regex se adapta.
- **Extração de versículos** por capítulo (xhtml do livro), em cascata:
  1. Seletor TNM: `[id^="v"]`, `[id^="chapter"]`, `.v`, `.verse`, `[class*="verse"]`.
  2. Genérico EPUB3: `[epub\\:type="verse"]`.
  3. Regex fallback no texto puro: separa por `^\s*(\d{1,3})\s+` capturando até o próximo marcador.
- **Filtro de validade**: descarta xhtml que produza < 1 capítulo OU < 3 versículos (evita capturar prefácios/índices como "livros").

Performance:
- Toda a etapa acima é *pura/sincrona após o unzip*; retorna estruturas em memória.
- Reporta progresso via callback `onProgress(phase, pct)` com fases: `unzip` (0–5%), `parse-opf` (5–10%), `index-books` (10–90%), `write-db` (90–100%, controlado pelo store).

### 3. Refatoração: `src/lib/bible-notes-store.ts`

Bumpar `DB_VERSION` para **2**. No `onupgradeneeded`:
- Mantém o store `notes` (intacto).
- **Cria**:
  - `bible_libraries` — keyPath `id`, índices `by_lang`, `by_imported_at`.
  - `bibles` — keyPath composto `${libraryId}:${bookId}:${chapter}:${verse}`, índice `by_library`, `by_book`.
- **Remove** stores antigos (`bible_pt`, `bible_en`, `bible_es`, se existirem) usando `db.deleteObjectStore` quando presentes — *não* quebra usuários novos.

Nova API exportada:
- `importEpub(file: File, onProgress?): Promise<BibleLibrary>` — chama o parser, depois abre **uma única transação `readwrite`** em `bibles` + `bible_libraries`, faz `put` em chunks de 1000 com `setTimeout(0)` entre chunks (evita travar o thread principal). Retorna o registro `BibleLibrary`.
- `listLibraries(): Promise<BibleLibrary[]>`
- `removeLibrary(id): Promise<void>` — apaga registros via `IDBKeyRange.bound(\`${id}:\`, \`${id}:\uffff\`)`.
- `setActiveLibraryId(id)` / `getActiveLibraryId()` — em `localStorage` (`visita-sc-bible-active`).
- `getActiveLibrary(): Promise<BibleLibrary | null>`
- `getVerseFromLibrary(libraryId, bookId, chapter, verse): Promise<{text: string} | null>`

**Compatibilidade temporária (será removida em 3.3)**:
Mantém as exports antigas como *stubs no-op* para o app compilar enquanto a UI ainda não foi migrada:
- `downloadLanguage()` → lança erro amigável `"use importEpub"` (a UI antiga vai capturar).
- `removeLanguage()` → no-op.
- `getLangStatus()` → sempre retorna `{ downloaded: false, verseCount: 0 }`.
- `getVerse()` → delega para `getVerseFromLibrary` usando a library ativa (best-effort).
- Re-exporta `BibleLangStatus` como `type`.

### 4. Não tocar nesta sub-etapa
- `BibleManagerDialog.tsx` — continua mostrando PT/EN/ES, mas o botão "Baixar" vai falhar silenciosamente (será trocado em 3.3).
- `BibleVersePopover.tsx` / `bible-refs.ts` / `_app.consideracoes-campo.tsx` — intocados (3.2 e 3.3).
- `bible-seed.ts` — fica no repo, só é removido em 3.3.
- i18n — sem mudanças aqui.

## Resultado esperado ao final de 3.1
- App **compila e roda** normalmente.
- IndexedDB migra para v2 sem perda de notas.
- O modal antigo de Bíblia ainda aparece, mas o botão "Baixar" não faz nada útil (esperado — será trocado em 3.3).
- Base pronta para 3.2 (regex dinâmico) e 3.3 (nova UI de import).

## Confirmar para prosseguir
Posso aplicar a sub-etapa 3.1 conforme acima?
