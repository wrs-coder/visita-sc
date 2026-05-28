# Plano executado: Tela cheia sem scroll lateral + Editor rich-text leve

## Status: ✅ Implementado

### Mudanças
- **Tela cheia (`FullscreenOutline`)**: container raiz `w-screen max-w-full overflow-x-hidden overscroll-x-none`, body scroll horizontal travado via efeito, corpo com `overflow-y-auto overflow-x-hidden`, inner com `min-w-0 break-words [overflow-wrap:anywhere]`.
- **Editor Tiptap**: `RichNoteEditor` + `RichNoteToolbar` com Normal/Título/Subtítulo (h2/h3), negrito, itálico, bullets, cor de texto, marca-texto. Emojis nativos suportados. Toolbar esconde quando teclado virtual recolhe via `useVirtualKeyboardVisible`.
- **Sanitizer + renderer** em `src/lib/rich-content.tsx`: whitelist estrita de tags/atributos; renderiza HTML preservando formatação e injeta `VerseLink` em cada text node.
- **`stripHtmlForDetection`** em `src/lib/bible-refs.ts` (aditivo) — usado pelos "chips" detectados.
- **i18n** PT/EN/ES com novas chaves `personalOutlines.editor.*`.
- **Testes**: 48/48 passando (4 novos para stripHtmlForDetection).

### Não alterado
IndexedDB schema, exportações PDF/JSON, fila offline, sincronização, RLS superintendente, popover bíblico (z-[110] mantido), APK/Capacitor/PWA.
