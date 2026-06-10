# Onda 7.8 — Editor de notas premium ✅ entregue

`src/components/notes/RichNoteEditor.tsx` ganhou três extensões Tiptap e um rodapé vivo:
- `@tiptap/extension-typography` — aspas curvas, travessões, reticências e setas
  convertidos enquanto digita.
- `@tiptap/extension-character-count` — base para o rodapé com contagem viva.
- `@tiptap/extension-focus` (Focus) — marca o bloco ativo com `has-focus`,
  habilitando o **Modo foco** (dim 40% nos demais parágrafos).

`src/components/notes/RichNoteToolbar.tsx` ganhou um botão **Modo foco** (ícone
`Focus`, `aria-pressed`, props opcionais `focusMode` / `onToggleFocusMode`).

Rodapé sticky no fundo do editor mostra `palavras · caracteres · ~min de leitura`
(visível quando o editor está focado ou já tem conteúdo, `aria-live="polite"`).

`bunx tsc --noEmit` limpo.
