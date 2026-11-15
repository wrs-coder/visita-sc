import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { cycleFirstLine, firstLineFromElement, firstLineStyle, nextFirstLine, type FirstLineAttrs } from "@/lib/first-line-indent";
import { countWords, speakingMinutes } from "@/lib/word-counter";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { FontFamily } from "@tiptap/extension-font-family";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Focus as TiptapFocus } from "@tiptap/extension-focus";
import { RichNoteToolbar } from "./RichNoteToolbar";
import { FontSize } from "./extensions/font-size";
import { OutlineTopic } from "./extensions/outline-topic";
import { SearchReplace } from "./extensions/search-replace";
import { RichNoteSearchBar } from "./RichNoteSearchBar";
import { OutlineAttachmentsBar } from "./OutlineAttachmentsBar";
import { AttachmentAddDialog } from "./AttachmentAddDialog";
import { useVirtualKeyboardVisible, useVisualViewportInset } from "@/hooks/use-virtual-keyboard";
import { toolbarDock, toolbarOpenFromStorage } from "@/lib/editor-toolbar-dock";
import { cn } from "@/lib/utils";
import { RICH_NOTE_CONTENT_CLASS } from "@/lib/rich-note-styles";
import { cleanWordHtml } from "@/lib/word-paste-cleaner";
import { Slice } from "@tiptap/pm/model";

import type { NoteAttachment } from "@/lib/outline-attachments";

interface RichNoteEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  noteId?: string;
  className?: string;
  minHeight?: string;
  /** Altura máxima do contêiner. Default "70vh". Use "none" para desativar. */
  maxHeight?: string;
  /** ID do esboço — quando presente, exibe o cronômetro (Missão 06). */
  outlineId?: string;
  /** Missão 01: barra compacta (2 linhas) — usado no modo edição imersivo. */
  compact?: boolean;
  /** Anexos atuais do esboço (opcional). */
  attachments?: NoteAttachment[];
  /** Callback para atualizar a lista de anexos (opcional). */
  onAttachmentsChange?: (next: NoteAttachment[]) => void;
  /** Quando presente, a barra pode ser recolhida; a escolha fica neste aparelho sob esta chave (inicia aberta). */
  collapsibleToolbarKey?: string;
}


// Extensão de recuo (indent) — preserva margens vindas do Word e permite
// aumentar/diminuir o recuo de parágrafos e títulos. Salva como atributo
// `indent` (0–8) no nó e renderiza como margin-left em múltiplos de 32px.
/** Cola como bloco o 1º parágrafo que traz recuo, para não perder o recuo. */
function keepPastedIndent(slice: Slice): Slice {
  const first = slice.content.firstChild;
  if (!first || slice.openStart === 0 || !first.isTextblock) return slice;
  const a = first.attrs as { indent?: number; firstLine?: number };
  if (!(Number(a.indent) > 0 || Number(a.firstLine) !== 0)) return slice;
  return new Slice(slice.content, 0, slice.openEnd);
}

const IndentExtension = Extension.create({
  name: "indent",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      minLevel: 0,
      maxLevel: 8,
      step: 32,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const el = element as HTMLElement;
              const style = el.getAttribute("style") || "";
              // No recuo deslocado o padding-left é das linhas seguintes,
              // não do bloco.
              const hanging = (parseFloat(el.style.textIndent) || 0) < 0;
              const ml =
                parseFloat(el.style.marginLeft) ||
                (hanging ? 0 : parseFloat(el.style.paddingLeft)) ||
                0;
              // Recuo da 1ª linha (text-indent) é guardado à parte, em firstLine.
              const total = ml;
              if (!total) {
                // tenta extrair "margin-left:NNpt" de string composta
                const m = /margin-left:\s*([\d.]+)pt/i.exec(style);
                if (m) {
                  const pt = parseFloat(m[1]);
                  const px = pt * 1.3333;
                  return Math.min(8, Math.max(0, Math.round(px / 32)));
                }
                return 0;
              }
              return Math.min(8, Math.max(0, Math.round(total / 32)));
            },
            renderHTML: (attrs) => {
              const lvl = Number(attrs.indent) || 0;
              if (!lvl) return {};
              return { style: `margin-left: ${lvl * 32}px` };
            },
          },
          // 1ª linha (positivo, degraus de 32px) ou deslocado (negativo,
          // degraus de 16px), igual ao Word.
          firstLine: {
            default: 0,
            parseHTML: (element) => firstLineFromElement(element as HTMLElement),
            renderHTML: (attrs) => {
              const style = firstLineStyle(Number(attrs.firstLine) || 0);
              return style ? { style } : {};
            },
          },
        },
      },
    ];
  },
  addCommands() {
    const change = (delta: number) => () => {
      return ({
        state,
        dispatch,
      }: {
        state: import("@tiptap/pm/state").EditorState;
        dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void;
      }) => {
        const { from, to } = state.selection;
        const tr = state.tr;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!this.options.types.includes(node.type.name)) return;
          const cur = (node.attrs.indent as number) || 0;
          const next = Math.min(
            this.options.maxLevel,
            Math.max(this.options.minLevel, cur + delta),
          );
          if (next !== cur) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };
    };
    const toggleFirstLine = () => ({
      state,
      dispatch,
    }: {
      state: import("@tiptap/pm/state").EditorState;
      dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void;
    }) => {
      const { from, to } = state.selection;
      const tr = state.tr;
      let turnOn: boolean | null = null;
      let changed = false;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!this.options.types.includes(node.type.name)) return;
        if (turnOn === null) turnOn = !((node.attrs.firstLine as number) > 0);
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...nextFirstLine(node.attrs as FirstLineAttrs, turnOn) });
        changed = true;
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };
    // Normal → 1ª linha → Deslocado → Normal (o 1º parágrafo decide o passo).
    const cycleFirstLineCmd = () => ({
      state,
      dispatch,
    }: {
      state: import("@tiptap/pm/state").EditorState;
      dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void;
    }) => {
      const { from, to } = state.selection;
      const tr = state.tr;
      let mode: "none" | "first" | "hanging" | null = null;
      let changed = false;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!this.options.types.includes(node.type.name)) return;
        const a = node.attrs as FirstLineAttrs;
        const fl = Number(a.firstLine) || 0;
        if (mode === null) mode = fl > 0 ? "first" : fl < 0 ? "hanging" : "none";
        const indent = Number(a.indent) || 0;
        const next: FirstLineAttrs =
          mode === "none" ? cycleFirstLine({ indent, firstLine: 0 })
          : mode === "first" ? { indent, firstLine: -1 }
          : { indent, firstLine: 0 };
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next });
        changed = true;
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };
    return {
      indentBlock: change(1),
      outdentBlock: change(-1),
      toggleFirstLine,
      cycleFirstLine: cycleFirstLineCmd,
    } as never;
  },
});

export function RichNoteEditor({
  value,
  onChange,
  placeholder,
  noteId,
  className,
  minHeight = "240px",
  maxHeight = "70vh",
  outlineId,
  compact = false,
  attachments,
  onAttachmentsChange,
  collapsibleToolbarKey,
}: RichNoteEditorProps) {
  // Barra sempre no rodapé (Samsung Notes); recolhida só se o usuário recolheu.
  const [toolbarOpen, setToolbarOpen] = useState(true);
  useEffect(() => {
    if (!collapsibleToolbarKey) return;
    try { setToolbarOpen(toolbarOpenFromStorage(localStorage.getItem(collapsibleToolbarKey))); } catch { /* */ }
  }, [collapsibleToolbarKey]);
  const toggleToolbar = () => setToolbarOpen((v) => {
    const n = !v;
    try { if (collapsibleToolbarKey) localStorage.setItem(collapsibleToolbarKey, n ? "1" : "0"); } catch { /* */ }
    return n;
  });

  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const kbVisible = useVirtualKeyboardVisible();
  const viewport = useVisualViewportInset();
  const lastEmittedRef = useRef<string>("");
  const [attachDialog, setAttachDialog] = useState<"photo" | "link" | "videoFile" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Tick para forçar leitura do CharacterCount após updates de conteúdo.
  const [, setTick] = useState(0);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        TextStyle,
        FontSize,
        Color,
        FontFamily.configure({ types: ["textStyle"] }),
        Highlight.configure({ multicolor: true }),
        Underline,
        Subscript,
        Superscript,
        // Onda 7.8 — Tipografia premium: aspas curvas, travessões,
        // reticências e setas convertidos automaticamente enquanto digita.
        Typography,
        // Contagem viva de palavras e caracteres (sem custo perceptível;
        // o storage é exposto pelo editor.storage.characterCount).
        CharacterCount.configure({}),
        // Localizar e substituir: só destaca na tela, não muda o HTML salvo.
        SearchReplace,
        // Marca o bloco com `.has-focus` para o modo foco dimar os demais.
        TiptapFocus.configure({ className: "has-focus", mode: "all" }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        IndentExtension,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        OutlineTopic.configure({
          labels: {
            rename: t("personalOutlines.topics.rename", { defaultValue: "Renomear tópico" }),
            remove: t("personalOutlines.topics.remove", { defaultValue: "Remover tópico" }),
            defaultTitle: t("personalOutlines.topics.defaultTitle", { defaultValue: "Tópico" }),
            titlePrompt: t("personalOutlines.topics.titlePrompt", { defaultValue: "Título do tópico" }),
            timeOff: t("personalOutlines.topics.timeOff", { defaultValue: "tempo" }),
            minutesPrompt: t("personalOutlines.topics.minutesPrompt", { defaultValue: "Minutos deste tópico (vazio = sem controle de tempo)" }),
          },
        }),
        Placeholder.configure({
          placeholder: placeholder ?? t("personalOutlines.editor.placeholder"),
        }),
      ],
      content: value || "",
      editorProps: {
        // Colagem do Word: limpa o HTML do Office e mantém a formatação útil.
        transformPastedHTML: (html) => {
          try {
            return cleanWordHtml(html);
          } catch {
            return html;
          }
        },
        // Sem isto, o 1º parágrafo colado se funde ao parágrafo do cursor e
        // perde o recuo (bloco ou 1ª linha) que veio do Word.
        transformPasted: (slice) => keepPastedIndent(slice),
        // A barra fica no rodapé (ou colada no teclado): o cursor nunca
        // para escondido atrás dela.
        scrollMargin: { top: 16, bottom: 88, left: 0, right: 0 },
        scrollThreshold: { top: 16, bottom: 88, left: 0, right: 0 },
        attributes: {
          class: cn(
            "prose-sm max-w-none focus:outline-none px-3 py-2",
            RICH_NOTE_CONTENT_CLASS,
          ),

        },
      },
      onUpdate: ({ editor }) => {
        if (editor.isDestroyed) return;
        let html: string;
        try { html = editor.isEmpty ? "" : editor.getHTML(); } catch { return; }
        lastEmittedRef.current = html;
        onChange(html);
        setTick((n) => (n + 1) % 1_000_000);
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    // Re-cria editor quando a nota muda (evita complicações de sincronização).
    [noteId],
  );

  // Sincroniza value externo (ex.: undo de outra fonte) sem recriar editor.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === lastEmittedRef.current) return;
    let current: string;
    try { current = editor.getHTML(); } catch { return; }
    if (current === value) return;
    if (!value && editor.isEmpty) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    lastEmittedRef.current = value;
  }, [value, editor]);

  // Contador acompanha também a seleção (palavras do trecho marcado).
  useEffect(() => {
    if (!editor) return;
    const upd = () => setTick((n) => (n + 1) % 1_000_000);
    editor.on("selectionUpdate", upd);
    return () => { editor.off("selectionUpdate", upd); };
  }, [editor]);

  // Barra no rodapé; com o teclado aberto ela sobe colada nele. Se o teclado
  // for de outro campo (ex.: título), a barra some para não tapar.
  const dock = toolbarDock({ keyboard: kbVisible, editorFocused: focused, searchOpen });
  const scrollsInside = maxHeight !== "none";

  // Contador de palavras e tempo de fala (130 palavras/min).
  type CharCountStorage = { characters: () => number };
  const cc = editor?.storage.characterCount as CharCountStorage | undefined;
  const chars = cc?.characters?.() ?? 0;
  let words = 0;
  let selWords = 0;
  if (editor && !editor.isDestroyed) {
    const { doc, selection } = editor.state;
    words = countWords(doc.textBetween(0, doc.content.size, " ", " "));
    if (!selection.empty) selWords = countWords(doc.textBetween(selection.from, selection.to, " ", " "));
  }
  const speakMin = speakingMinutes(selWords || words);
  // Com o teclado aberto o contador ficaria escondido atrás da barra.
  const showFooter = (focused || words > 0) && dock !== "keyboard";

  return (
    <div
      className={cn(
        // Coluna: texto ocupa o espaço e a barra fica sempre no rodapé da
        // caixa (Samsung Notes), mesmo com pouco texto.
        "rounded-md border bg-background relative flex flex-col",
        // Com altura máxima, a caixa rola por dentro e a barra fica presa no
        // rodapé dela; sem altura máxima, quem rola é a tela.
        scrollsInside ? "overflow-y-auto overflow-x-hidden" : "overflow-x-clip",
        // Onda 7.8 — modo foco: dim em parágrafos fora do bloco ativo
        // (apenas visual; o conteúdo continua editável).
        focusMode && [
          "[&_.ProseMirror>*]:opacity-40 [&_.ProseMirror>*]:transition-opacity",
          "[&_.ProseMirror>.has-focus]:opacity-100",
        ],
        className,
      )}
      style={{ minHeight, maxHeight: maxHeight === "none" ? undefined : maxHeight }}
      onClick={(e) => {
        if (!editor) return;
        const target = e.target as HTMLElement;
        // Toque fora do texto (área vazia da folha): cursor no fim.
        if (target.closest(".ProseMirror") || target.closest("button,a,input,[data-editor-toolbar]")) return;
        editor.chain().focus("end").run();
      }}
    >
      {editor && searchOpen && (
        <RichNoteSearchBar editor={editor} onClose={() => { setSearchOpen(false); editor.chain().focus().run(); }} />
      )}

      {onAttachmentsChange && attachments && attachments.length > 0 && (
        <OutlineAttachmentsBar
          attachments={attachments}
          onRemove={(id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))}
        />
      )}

      {/* Folha livre (Samsung Notes): o texto ocupa toda a área, então tocar
          em qualquer espaço vazio abaixo dele leva o cursor para o fim. */}
      <EditorContent editor={editor} className="flex flex-1 flex-col [&>.ProseMirror]:min-h-full [&>.ProseMirror]:flex-1" />
      {dock === "keyboard" && <div aria-hidden className="h-16" />}
      <div className="sticky bottom-0 z-20 shrink-0">
        {showFooter && (
          <div
            className="flex items-center justify-end gap-3 border-t bg-background/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur"
            aria-live="polite"
          >
            <span title={t("personalOutlines.editor.stats.chars", { defaultValue: "{{count}} caracteres", count: chars })}>
              {selWords > 0 && (
                <span className="font-medium text-foreground">
                  {t("personalOutlines.editor.stats.selection", { defaultValue: "Seleção:" })}{" "}
                </span>
              )}
              {t("personalOutlines.editor.stats.words", {
                defaultValue: "{{formattedCount}} palavras",
                count: selWords || words,
                formattedCount: (selWords || words).toLocaleString(),
              })}
            </span>
            <span aria-hidden>·</span>
            <span>
              {t("personalOutlines.editor.stats.speaking", {
                defaultValue: "~{{min}} min de fala",
                min: speakMin,
              })}
            </span>
          </div>
        )}
        <RichNoteToolbar
          editor={editor}
          dock={dock}
          keyboardInset={viewport.inset}
          visibleHeight={viewport.height}
          collapsed={!!collapsibleToolbarKey && !toolbarOpen}
          onToggleCollapsed={collapsibleToolbarKey ? toggleToolbar : undefined}
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode((v) => !v)}
          outlineId={outlineId}
          compact={compact}
          onAddPhotoAttachment={onAttachmentsChange ? () => setAttachDialog("photo") : undefined}
          onAddVideoAttachment={onAttachmentsChange ? () => setAttachDialog("videoFile") : undefined}
          onAddLinkAttachment={onAttachmentsChange ? () => setAttachDialog("link") : undefined}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </div>

      {onAttachmentsChange && attachDialog && (
        <AttachmentAddDialog
          open
          mode={attachDialog}
          noteId={noteId ?? "unknown"}
          onClose={() => setAttachDialog(null)}
          onAdd={(a) => onAttachmentsChange([...(attachments ?? []), a])}
        />
      )}
    </div>
  );
}
