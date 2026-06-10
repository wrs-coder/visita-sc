import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
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
import { RichNoteToolbar } from "./RichNoteToolbar";
import { useVirtualKeyboardVisible } from "@/hooks/use-virtual-keyboard";
import { cn } from "@/lib/utils";

interface RichNoteEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  noteId?: string;
  className?: string;
  minHeight?: string;
}

// Extensão de recuo (indent) — preserva margens vindas do Word e permite
// aumentar/diminuir o recuo de parágrafos e títulos. Salva como atributo
// `indent` (0–8) no nó e renderiza como margin-left em múltiplos de 32px.
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
              const ml =
                parseFloat(el.style.marginLeft) ||
                parseFloat(el.style.paddingLeft) ||
                0;
              const ti = parseFloat(el.style.textIndent) || 0;
              // Word costuma usar "mso-list" e margens em pt — converte ~ a px.
              const total = Math.max(ml, ti);
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
    return {
      indentBlock: change(1),
      outdentBlock: change(-1),
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
}: RichNoteEditorProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const kbVisible = useVirtualKeyboardVisible();
  const lastEmittedRef = useRef<string>("");

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        TextStyle,
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
        Placeholder.configure({
          placeholder: placeholder ?? t("personalOutlines.editor.placeholder"),
        }),
      ],
      content: value || "",
      editorProps: {
        attributes: {
          class: cn(
            "prose-sm max-w-none focus:outline-none px-3 py-2",
            "[&_p]:my-1 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1",
            "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
            "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
            "[&_mark]:rounded [&_mark]:px-0.5",
            "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
            "[&_table]:my-2 [&_table]:border-collapse [&_table]:w-full",
            "[&_table_td]:border [&_table_td]:border-border [&_table_td]:px-2 [&_table_td]:py-1",
            "[&_table_th]:border [&_table_th]:border-border [&_table_th]:px-2 [&_table_th]:py-1 [&_table_th]:bg-muted [&_table_th]:font-semibold",
            "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-2",
            "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li]:items-start",
            "[&_ul[data-type=taskList]_li>label]:mt-1",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2",
            "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_code]:font-mono",
            "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0",
            "[&_hr]:my-3 [&_hr]:border-t [&_hr]:border-border",
            "[&_sub]:text-[0.75em] [&_sup]:text-[0.75em]",
          ),
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.isEmpty ? "" : editor.getHTML();
        lastEmittedRef.current = html;
        onChange(html);
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    // Re-cria editor quando a nota muda (evita complicações de sincronização).
    [noteId],
  );

  // Sincroniza value externo (ex.: undo de outra fonte) sem recriar editor.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    const current = editor.getHTML();
    if (current === value) return;
    if (!value && editor.isEmpty) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    lastEmittedRef.current = value;
  }, [value, editor]);

  // Esconde toolbar quando o teclado recolhe e o editor não tem foco (mobile).
  const toolbarVisible = focused || !kbVisible;

  return (
    <div
      className={cn(
        // Container do editor com rolagem interna própria — funciona como
        // "congelar linha superior" (Excel): a barra fica sticky no topo
        // desta caixa e o conteúdo rola por baixo dela.
        "rounded-md border bg-background relative overflow-y-auto overflow-x-hidden",
        className,
      )}
      style={{ minHeight, maxHeight: "70vh" }}
      onClick={() => editor?.chain().focus().run()}
    >
      <RichNoteToolbar editor={editor} visible={toolbarVisible} />
      <EditorContent editor={editor} />
    </div>
  );
}
