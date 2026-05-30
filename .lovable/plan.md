## Customização visual do popup bíblico (ViewSettings)

Camada puramente visual aplicada por cima do texto já carregado em `BibleVersePopover.tsx`. Nenhuma alteração na busca (`getVerseFromLibrary`), no dado armazenado, nem no texto compartilhado.

### 1. Novo módulo `src/lib/bible-view-settings.ts`
- Tipos:
  - `BibleViewSettings = { color: "white"|"black"|"sepia"|"yellow"|"night_blue"; bold: boolean }`
  - `BibleHighlight = { start: number; end: number }` (offsets dentro do texto do versículo)
- Chaves no `localStorage`:
  - `bible:view-settings` → preferências globais (cor + negrito).
  - `bible:highlights:v1` → mapa `{ [libraryId|bookId|chapter|verse]: BibleHighlight[] }`.
- API: `loadSettings()`, `saveSettings(patch)`, `getHighlights(key)`, `addHighlight(key, h)`, `removeHighlightAt(key, offset)`.
- Tudo síncrono (localStorage) — zero rede, zero Supabase.

### 2. Tokens de cor em `src/styles.css`
Adicionar variáveis semânticas (oklch) e classes utilitárias:
- `.bible-color-white | -black | -sepia | -yellow | -night-blue` (cor de texto + cor de fundo do container).
- `.bible-text-bold` (font-weight 700).
- `.bible-highlight` (marca-texto amarelo translúcido, respeitando o tema).

### 3. UI no `BibleVersePopover.tsx`
- Adicionar barra de ferramentas (logo abaixo da alça de arrasto):
  - 5 swatches de cor (Branco, Preto, Sépia, Amarelo, Azul Noturno).
  - Toggle "Negrito" (ícone `Bold` do lucide).
  - Botão "Grifar" (ícone `Highlighter`) que aplica grifo ao trecho atualmente selecionado dentro do popup.
  - Botão "Limpar grifos" deste versículo (ícone `Eraser`).
- O container do texto recebe classes dinâmicas: `bible-color-${color}`, opcional `bible-text-bold`.
- Renderização dos grifos: para cada versículo, dividir `text` em segmentos `<span>`/`<mark className="bible-highlight">` com base nos offsets persistidos para a chave `libraryId|bookId|chapter|verse`. Sem mutar `parts`.
- Captura da seleção: ao clicar "Grifar", usar `window.getSelection()` + `Range` dentro do container; mapear o intervalo selecionado para offsets do texto do versículo correspondente (cada `<p>`/`<span>` recebe `data-verse={n}` e o texto puro como única text-node para mapeamento estável), persistir e re-renderizar.
- Clicar num `<mark>` existente remove aquele grifo (via `removeHighlightAt`).

### 4. i18n (`pt.json`, `en.json`, `es.json`)
Adicionar no bloco `bibleVerse`:
- `viewSettings`, `color`, `colors.white|black|sepia|yellow|night_blue`, `bold`, `highlight`, `clearHighlights`, `selectToHighlight`.

### 5. Garantias (restrições do pedido)
- `getVerseFromLibrary` e o `useEffect` de carregamento permanecem intocados.
- O array `parts` (fonte da verdade do texto) nunca é modificado — grifos vivem em estado paralelo no localStorage.
- Qualquer função externa de compartilhamento continua lendo do mesmo dado original; nada na camada visual altera o texto-fonte.
- Zero chamadas a Supabase; tudo síncrono no cliente, sem novos efeitos de rede.
- Preferências aplicam-se instantaneamente (mudança de classe CSS no container) sem reabrir o popup.

### Arquivos afetados
- novo: `src/lib/bible-view-settings.ts`
- editado: `src/components/bible/BibleVersePopover.tsx`
- editado: `src/styles.css` (apenas adições)
- editado: `src/i18n/locales/{pt,en,es}.json` (apenas adições)
