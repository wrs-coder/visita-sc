import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  Palette,
  Highlighter,
  Heading2,
  Heading3,
  Pilcrow,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  "#0f172a", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#0891b2", "#2563eb", "#7c3aed",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#fecaca", "#bbf7d0", "#bae6fd",
  "#ddd6fe", "#fbcfe8", "#fed7aa", "#e5e7eb",
];

interface ToolbarProps {
  editor: Editor | null;
  visible?: boolean;
}

export function RichNoteToolbar({ editor, visible = true }: ToolbarProps) {
  const { t } = useTranslation();
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  const btn = (active: boolean) =>
    cn(
      "h-8 w-8 p-0 rounded-md hover:bg-muted transition-colors",
      active && "bg-muted text-primary",
    );

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border-b bg-background/95 backdrop-blur px-2 py-1.5 transition-all",
        !visible && "opacity-0 pointer-events-none -translate-y-1",
      )}
    >
      {/* Estilo de bloco */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("paragraph") && !isActive("heading"))}
        title={t("personalOutlines.editor.toolbar.normal")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("heading", { level: 2 }))}
        title={t("personalOutlines.editor.toolbar.title")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("heading", { level: 3 }))}
        title={t("personalOutlines.editor.toolbar.subtitle")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("bold"))}
        title={t("personalOutlines.editor.toolbar.bold")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("italic"))}
        title={t("personalOutlines.editor.toolbar.italic")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("bulletList"))}
        title={t("personalOutlines.editor.toolbar.bullets")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Cor de texto */}
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btn(false)}
            title={t("personalOutlines.editor.toolbar.color")}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 z-[120]" align="start">
          <div className="grid grid-cols-4 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 w-6 rounded-md border border-border"
                style={{ backgroundColor: c }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(c).run();
                  setColorOpen(false);
                }}
                aria-label={c}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setColorOpen(false);
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> {t("personalOutlines.editor.toolbar.reset")}
          </Button>
        </PopoverContent>
      </Popover>

      {/* Marca-texto */}
      <Popover open={hlOpen} onOpenChange={setHlOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btn(isActive("highlight"))}
            title={t("personalOutlines.editor.toolbar.highlight")}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 z-[120]" align="start">
          <div className="grid grid-cols-4 gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 w-6 rounded-md border border-border"
                style={{ backgroundColor: c }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color: c }).run();
                  setHlOpen(false);
                }}
                aria-label={c}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              setHlOpen(false);
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> {t("personalOutlines.editor.toolbar.reset")}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
