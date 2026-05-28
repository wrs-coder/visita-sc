import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
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
        "rounded-md border bg-background overflow-hidden",
        className,
      )}
    >
      <RichNoteToolbar editor={editor} visible={toolbarVisible} />
      <div
        className="overflow-y-auto"
        style={{ minHeight }}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
