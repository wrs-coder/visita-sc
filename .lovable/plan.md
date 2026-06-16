# Localizar o título do popup bíblico pelo idioma da interface

## Problema
O popup mostra "Matthew 6:33" mesmo com a UI em português e o texto do versículo em português, porque `match.bookName` é preenchido com o `displayName` extraído do EPUB ativo (que muitas vezes tem TOC em inglês). O usuário escreveu "Mateus 6:33" e espera ver "Mateus" no cabeçalho.

## Decisão
O título do popup deve seguir **o idioma da interface (i18next)** — PT/EN/ES — independente do idioma do EPUB ou do termo digitado. Isso garante consistência com o resto da UI e cobre exatamente os 3 idiomas já suportados.

## Solução

### 1. Adicionar mapa de nomes localizados em `src/lib/bible-canon.ts`
Hoje `CanonicalBook` tem apenas `english` + `aliases` (lista plana). Vou adicionar um campo opcional `names: { pt: string; en: string; es: string }` com o nome canônico de cada um dos 66 livros nos 3 idiomas suportados. O `english` atual continua como fallback final.

```ts
export interface CanonicalBook {
  id: string;
  order: number;
  english: string;
  names: { pt: string; en: string; es: string };
  aliases: string[];
}
```

A lista `RAW` ganha um 3º elemento posicional `[order, english, names, ...aliases]` ou, mais limpo, viro a estrutura para objeto. Os aliases existentes não mudam (detecção continua funcionando).

### 2. Criar helper `getLocalizedBookName(bookId, lang)` em `bible-canon.ts`
```ts
export function getLocalizedBookName(bookId: string, lang: "pt" | "en" | "es"): string | null
```
Retorna `names[lang]` ou `null` se não encontrar.

### 3. Localizar no consumo, não na detecção
**Não vou mexer em `bible-refs.ts`** (mantém `bookName` = displayName do EPUB como hoje, para não quebrar nada que dependa do `CitationMatch.bookName` em outros lugares). A localização acontece no ponto de renderização:

**`src/components/bible/BibleVersePopover.tsx`** (linha 339):
- Adicionar `const { i18n } = useTranslation()` (já há `useTranslation`).
- Computar `displayBook = getLocalizedBookName(match.bookId, i18n.language) ?? match.bookName`.
- Trocar `{match.bookName}` por `{displayBook}` no cabeçalho.

### 4. Checar outros consumidores
Buscar outros usos de `match.bookName` / `CitationMatch.bookName`:
- `src/lib/rich-content.tsx`
- `src/components/dashboard/FieldNoteFullscreenDialog.tsx`
- `src/routes/_app.consideracoes-campo.tsx`

Aplicar o mesmo `getLocalizedBookName` apenas onde o nome é exibido ao usuário (cabeçalho/título). Onde o valor é usado para lógica/identificação, manter `bookName` original.

## O que NÃO muda
- Detecção de citações (`findCitations`) — mesma lógica, mesmos aliases, mesma resolução de ambiguidade.
- `displayName` do EPUB — continua sendo a fonte de verdade para a Biblioteca/Manager.
- Suporte aos 3 idiomas (PT/EN/ES) — sem regressão; outros idiomas continuam caindo no fallback `match.bookName`.
- Memória do projeto: zero Bíblia embutida; apenas o mapa de **nomes** dos 66 livros (~3 KB de strings, já é conhecimento canônico público — nome de livro não é tradução de texto bíblico).

## Verificação
1. `bunx tsc --noEmit` limpo.
2. Smoke manual no `/consideracoes-campo`: escrever "Mateus 6:33" com UI em PT → título mostra "Mateus 6:33".
3. Trocar idioma da UI para EN → recarregar popup → título mostra "Matthew 6:33".
4. Trocar para ES → "Mateo 6:33".
5. Confirmar que esboço (modo onde já funcionava) continua coerente.

## Detalhes técnicos

### Tamanho do diff
- `bible-canon.ts`: adicionar 66 entradas `names` (~80 linhas, refatoração estrutural) + função helper (~10 linhas).
- `BibleVersePopover.tsx`: 2 linhas (import + cálculo) + 1 char no JSX.
- Outros consumidores: 0–3 trocas pontuais conforme auditoria.

### Risco
Baixo. Mudança puramente de apresentação; lógica de detecção e armazenamento intactas. Fallback garante que livros não mapeados (não deve haver — são os 66 canônicos) continuem exibindo o nome do EPUB.
