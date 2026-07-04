# Seletor Numérico de Tamanho de Fonte (Toolbar de Esboços)

Adição **isolada** de um Select numérico (8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30) na toolbar do editor Tiptap. Aplica `font-size` inline apenas à seleção, sem tocar no seletor de bloco (Normal/Título/Subtítulo/Citação) existente.

## 1. Extensão Tiptap `FontSize` (nova)

Criar `src/components/notes/extensions/font-size.ts` estendendo o mark `textStyle` (já presente via `@tiptap/extension-text-style`) para adicionar o atributo `fontSize`:

- `addGlobalAttributes` em `textStyle` com `fontSize`:
  - `parseHTML`: lê `element.style.fontSize` (aceita valores em `px`).
  - `renderHTML`: emite `style="font-size: <valor>px"` (mesclado com outros atributos de `textStyle` como cor/família — o TextStyle já faz a fusão).
- Comandos `setFontSize(px: number)` e `unsetFontSize()`:
  - `setFontSize`: `chain().setMark('textStyle', { fontSize: \`${px}px\` }).run()`.
  - `unsetFontSize`: `chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()`.
- Sanitização: só aceita valores da lista fixa (8–30, passo 2). Inválidos → ignora.

Registrar a extensão no `useEditor` de `RichNoteEditor.tsx` logo depois de `TextStyle`. Nada mais no editor muda — o `content_json` já serializa marks `textStyle` normalmente, então sincroniza no Supabase automaticamente.

## 2. UI do Select na Toolbar

Editar `src/components/notes/RichNoteToolbar.tsx` (duas variantes: `compact` e desktop).

Componente reutilizável interno `FontSizeSelect({ editor })`:

- **Select shadcn** (`@/components/ui/select`) com `SelectTrigger` compacto (`h-8 w-16 px-2 text-xs`).
- **Options**: `[8,10,12,14,16,18,20,22,24,26,28,30]` + item extra `"Padrão"` no topo (chama `unsetFontSize()`).
- **Reatividade blindada (Android/mobile)**:
  - Estado local `currentSize` sincronizado **estritamente** via `editor.on('selectionUpdate', updater)` — **não** escutar `'transaction'` para evitar re-render a cada tecla digitada (gargalo em WebView Android).
  - Complementar com `editor.on('focus', updater)` para recomputar ao reentrar no editor.
  - `updater`: lê `editor.getAttributes('textStyle').fontSize`, extrai o número e atualiza o valor exibido; ausente = placeholder `"16"`.
  - `useEffect` faz `off()` de ambos os listeners no cleanup.
- **Preservação rígida da seleção (Android)**:
  - Ao abrir o Select (`onOpenChange(true)`), capturar `savedRange = { from, to }` de `editor.state.selection` em um `useRef`.
  - `onMouseDown={(e) => e.preventDefault()}` no `SelectTrigger` (mantém foco no editor no desktop).
  - No `onValueChange`, executar tudo numa única chain para não perder o range no WebView:
    ```
    editor.chain()
      .focus()
      .setTextSelection(savedRangeRef.current ?? editor.state.selection)
      .setFontSize(Number(v))   // ou .unsetFontSize() se for "Padrão"
      .run();
    ```
  - Isso garante que, mesmo se o Radix Select fechar o teclado do Android e colapsar a seleção do ProseMirror antes do handler, a formatação seja aplicada ao trecho originalmente selecionado.

Posicionamento:

- **Desktop (linha principal)**: ao lado dos botões B/I/U, logo antes do separador atual.
- **Compact (grid de 5 colunas)**: adicionar como célula no G2 (grupo Inline) — Select fica ao lado dos toggles B/I/U dentro do popover; e um mini-trigger de Select fica visível na barra dentro do grupo Fonte (G3), acima da lista de famílias existente. O seletor de bloco (G1) permanece intocado.

## 3. Comportamento

- Sem alterar bloco: `setMark('textStyle', ...)` só aplica ao trecho selecionado, nunca toca em `heading/paragraph`. Se não há seleção (caret), a marca fica "armada" para o próximo texto digitado (comportamento padrão Tiptap, esperado).
- "Padrão" remove o mark e o texto volta ao CSS herdado — garante que a janela imersiva continue calculando alturas normalmente, já que o CSS base do container não muda.

## 4. Validação

- `bunx tsgo --noEmit` 100% limpo.
- Nenhuma mudança em cálculos de layout imersivo (`_app.consideracoes-campo.tsx`, `FieldNoteFullscreenDialog.tsx`): a extensão apenas emite `<span style="font-size:Npx">`, que respeita o fluxo normal do documento.
- Testes existentes de sync/attachments não são afetados (a marca é parte do JSON padrão do Tiptap).

## Detalhes técnicos

- Arquivos alterados:
  - `src/components/notes/extensions/font-size.ts` (novo).
  - `src/components/notes/RichNoteEditor.tsx` — importa e registra `FontSize`.
  - `src/components/notes/RichNoteToolbar.tsx` — importa `Select` do shadcn e injeta `FontSizeSelect` nos dois modos.
- Sem novas deps npm (usa `@tiptap/extension-text-style` já instalado + `@tiptap/core`).
- Tipagem: `declare module '@tiptap/core' { interface Commands<ReturnType> { fontSize: { setFontSize: (px:number)=>ReturnType; unsetFontSize: ()=>ReturnType } } }`.
