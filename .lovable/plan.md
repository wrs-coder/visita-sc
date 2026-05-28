# Plano

## 1. Nomes de livros bíblicos voltando em inglês no popover

**Causa-raiz**: em `src/lib/epub-bible-parser.ts`, a função `detectCanonicalBookForDoc` (linhas 970–1003) retorna `label = hit.english` quando o livro é detectado pelo **nome do arquivo** (passo 1) ou pelo **corpo do texto** (passo 3). Só o passo 2 (heading) usa o texto localizado do EPUB. Como a TNM PT tem nomes de arquivo do tipo `60_Mat_01.xhtml`, o passo 1 vence e o `label` vira `"Matthew"` / `"John"`, que depois é usado como `displayName` em `compile()` (`src/lib/bible-refs.ts`) e renderizado no popover (`BibleVersePopover.tsx` linha 99).

**Correção** (apenas em `detectCanonicalBookForDoc`):
- Após qualquer detecção (filename, heading, body), tentar **sempre** extrair um label localizado dos headings (`h1`/`h2`/`h3`/`title`) do próprio documento. Se algum heading resolver para o **mesmo** `CanonicalBook`, usar esse texto (com o sufixo de capítulo limpo) como `label`. Caso contrário, manter o fallback atual (`hit.english`).
- Isso preserva o caminho rápido por filename, mas garante que o nome exibido venha do EPUB no idioma importado.

Sem alterações em `bible-canon.ts`, `bible-refs.ts`, `PURGE_SELECTORS`, `extractVersesFromDoc` ou na lógica do versículo 1 / último versículo. Requer reimportar a Bíblia em **Gerenciar Bíblias**.

## 2. Ajustes na aba de edição de Esboços Pessoais

Arquivo: `src/routes/_app.consideracoes-campo.tsx` + `src/i18n/locales/pt.json`.

- **"Exportar nota (JSON)" → "Exportar"**: alterar a string PT da chave `personalOutlines.folders.exportNote` em `pt.json` (linha 1215). Manter chave e usos (linha 771). en/es ficam como estão.
- **"Salvar nota" → "Salvar"**: alterar a string PT da chave `fieldConsiderations.save` em `pt.json` (linha 1167). Botão na linha 778 já usa essa chave.
- **Layout: gerenciador de pastas + nova nota acima das notas (e não ao lado)**: trocar o grid `md:grid-cols-[300px_1fr]` (linha 494) por uma stack vertical (`flex flex-col gap-4` em todos os breakpoints). A `Card` lateral vira a primeira linha (com `w-full` e `h-fit`) e o `Card` do editor segue abaixo. Sem alterações na barra sticky de ações nem no `RichNoteEditor`.

## Validação

- `bun test` (suíte do parser EPUB deve continuar passando).
- Reimportar a Bíblia TNM PT e abrir o popover para citações de Mateus/João/Apocalipse — devem aparecer em português.
- Conferir os 3 ajustes visuais na rota `/consideracoes-campo` (desktop e mobile a 770px).
