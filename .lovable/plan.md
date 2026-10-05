# Idioma correto das Bíblias importadas

## O que acontece hoje
Ao importar, o app lê só uma informação de idioma do EPUB. Algumas edições (como a Nwt-TPO, de Portugal) trazem essa informação ausente ou errada, e a Bíblia aparece como "English", embora o texto seja português. O app também não diferencia Brasil de Portugal.

## O que vai mudar
- O idioma passa a ser reconhecido por várias pistas do próprio EPUB, nesta ordem, até uma confirmar:
  1. O idioma declarado no EPUB, incluindo a região (pt-BR, pt-PT).
  2. O idioma marcado no pacote e nas primeiras páginas do livro.
  3. Os nomes dos livros (Gênesis, Génesis, Genesis…). Se eles mostrarem claramente português, espanhol ou inglês e isso contradisser o declarado, prevalecem os nomes dos livros.
- Nome exibido com região quando houver: "Português (Brasil)", "Português (Portugal)", "Español", "English". Outros idiomas continuam com o nome próprio do idioma (Français, Deutsch…).
- Bíblias já importadas são corrigidas sozinhas na lista, sem reimportar. A correção só atualiza o nome do idioma; textos, versículos, destaques, notas e a Bíblia ativa ficam intactos.

## O que não muda
Leitura, busca de citações, balão de versículos, destaques, armazenamento e a regra de só aceitar a TNM importada pelo usuário. Os idiomas de uso do app continuam sendo português, inglês e espanhol.

## Detalhes técnicos
- `src/lib/epub-bible-parser.ts`: `normalizeLang` passa a preservar a região (`pt-PT`, `pt-BR`); a etiqueta vem de `Intl.DisplayNames` no próprio idioma, com fallback na tabela `LANG_LABELS` e rótulos fixos para pt-BR/pt-PT. Fallbacks: `<package xml:lang>`, `<html lang|xml:lang>` dos primeiros XHTML da spine. Depois de extrair os livros, `detectBibleLanguage(books)` de `bible-refs.ts`; se o resultado for pt/en/es e diferente do idioma-base declarado, ele vence. Região só é mantida se o idioma-base coincidir. Para pt sem região, inferir Portugal por grafias europeias nos nomes dos livros (ex.: "Génesis", "Actos"); caso contrário, apenas "Português".
- `src/lib/bible-notes-store.ts`: o campo `lang` continua com o idioma-base de 2 letras (compatível com índices e o código atual). Nova `resolveLibraryLang(lib)` aplicada em `listLibraries()`/`getActiveLibrary()` recalcula `langLabel` a partir de `lib.books` e grava a correção uma vez (só os metadados da biblioteca, nunca versículos). Sem mudança no esquema do IndexedDB.
- Testes novos em vitest: EPUB com `dc:language="en"` e livros em português → "Português"; pt-PT → "Português (Portugal)"; biblioteca antiga com rótulo errado é corrigida sem tocar nos versículos.
- Não mexer em banco, servidor, login ou abertura do app. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
