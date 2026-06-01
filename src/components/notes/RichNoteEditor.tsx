import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
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
        Highlight.configure({ multicolor: true }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
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
        "rounded-md border bg-background overflow-y-auto relative",
        className,
      )}
      style={{ minHeight }}
      onClick={() => editor?.chain().focus().run()}
    >
      <RichNoteToolbar editor={editor} visible={toolbarVisible} />
      <EditorContent editor={editor} />
    </div>
  );
}
