import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  Palette,
  Highlighter,
  Heading2,
  Heading3,
  Pilcrow,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Link2Off,
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Quote,
  Code,
  Code2,
  Minus as Divider,
  IndentIncrease,
  IndentDecrease,
  Type,
  Focus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { OutlineTimer } from "./OutlineTimer";

const TEXT_COLORS = [
  "#0f172a", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#0891b2", "#2563eb", "#7c3aed",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#fecaca", "#bbf7d0", "#bae6fd",
  "#ddd6fe", "#fbcfe8", "#fed7aa", "#e5e7eb",
];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Padrão", value: "" },
  { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
];

interface ToolbarProps {
  editor: Editor | null;
  visible?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  /**
   * Quando presente, renderiza o cronômetro de esboço (Missão 06)
   * embutido na barra de ferramentas. Omitir em contextos que não são
   * esboços (ex.: subaba "Anotações").
   */
  outlineId?: string;
  /**
   * Missão 01 (modo edição imersivo): renderiza a barra em 2 linhas
   * com grupos colapsados em dropdowns ("split-button"), economizando
   * espaço vertical no smartphone sem perder funcionalidade.
   */
  compact?: boolean;
}

export function RichNoteToolbar({
  editor,
  visible = true,
  focusMode = false,
  onToggleFocusMode,
  outlineId,
  compact = false,
}: ToolbarProps) {
  const { t } = useTranslation();
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<string | null>(null);

  if (!editor) return null;


  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  const btn = (active: boolean) =>
    cn(
      "h-8 w-8 p-0 shrink-0 rounded-md hover:bg-muted transition-colors",
      active && "bg-muted text-primary",
    );

  const sep = (
    <div className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
  );

  const promptLink = () => {
    const prev = (editor.getAttributes("link") as { href?: string }).href ?? "";
    const url = window.prompt(t("personalOutlines.editor.toolbar.linkPrompt"), prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  // ===== Modo compacto (2 linhas, grupos em dropdowns) =====
  if (compact) {
    const groupBtn = (active: boolean) =>
      cn(
        "h-9 w-9 p-0 shrink-0 rounded-md hover:bg-muted transition-colors",
        active && "bg-muted text-primary",
      );
    const itemBtn = (active: boolean) =>
      cn(
        "h-9 w-9 p-0 shrink-0 rounded-md hover:bg-muted transition-colors",
        active && "bg-muted text-primary",
      );

    const openG = (id: string) => groupOpen === id;
    const setG = (id: string) => (o: boolean) => setGroupOpen(o ? id : null);

    const closeAll = () => setGroupOpen(null);

    const popoverContent = (children: ReactNode) => (
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-1 z-[120] flex flex-row items-center gap-1"
        onMouseDown={(e) => e.preventDefault()}
      >
        {children}
      </PopoverContent>
    );

    return (
      <div
        className={cn(
          "sticky top-0 z-20 grid grid-cols-5 gap-1 rounded-t-md border-b bg-background/95 backdrop-blur px-2 py-1.5 transition-all",
          !visible && "opacity-0 pointer-events-none -translate-y-1",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* G1 — Estilo de bloco */}
        <Popover open={openG("block")} onOpenChange={setG("block")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm"
              className={groupBtn(isActive("heading") || isActive("blockquote"))}
              title={t("personalOutlines.editor.toolbar.title")}
              onMouseDown={(e) => e.preventDefault()}>
              <Heading2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("paragraph") && !isActive("heading"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.normal")} onClick={() => { editor.chain().focus().setParagraph().run(); closeAll(); }}><Pilcrow className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("heading", { level: 2 }))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.title")} onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); closeAll(); }}><Heading2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("heading", { level: 3 }))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.subtitle")} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); closeAll(); }}><Heading3 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("blockquote"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.blockquote")} onClick={() => { editor.chain().focus().toggleBlockquote().run(); closeAll(); }}><Quote className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G2 — Inline (B/I/U/Sub/Sup) */}
        <Popover open={openG("inline")} onOpenChange={setG("inline")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm"
              className={groupBtn(isActive("bold") || isActive("italic") || isActive("underline") || isActive("subscript") || isActive("superscript"))}
              title={t("personalOutlines.editor.toolbar.bold")}
              onMouseDown={(e) => e.preventDefault()}>
              <Bold className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("bold"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.bold")} onClick={() => { editor.chain().focus().toggleBold().run(); }}><Bold className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("italic"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.italic")} onClick={() => { editor.chain().focus().toggleItalic().run(); }}><Italic className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("underline"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.underline")} onClick={() => { editor.chain().focus().toggleUnderline().run(); }}><UnderlineIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("subscript"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.subscript")} onClick={() => { editor.chain().focus().toggleSubscript().run(); }}><SubIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("superscript"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.superscript")} onClick={() => { editor.chain().focus().toggleSuperscript().run(); }}><SupIcon className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G3 — Fonte */}
        <Popover open={openG("font")} onOpenChange={setG("font")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(false)} title={t("personalOutlines.editor.toolbar.fontFamily")} onMouseDown={(e) => e.preventDefault()}>
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-48 p-1 z-[120]">
            {FONT_FAMILIES.map((f) => (
              <Button key={f.label} type="button" variant="ghost" size="sm" className="w-full justify-start h-8 text-xs"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (f.value) editor.chain().focus().setFontFamily(f.value).run();
                  else editor.chain().focus().unsetFontFamily().run();
                  closeAll();
                }}>
                <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
              </Button>
            ))}
          </PopoverContent>
        </Popover>

        {/* G4 — Cor de texto */}
        <Popover open={openG("color")} onOpenChange={setG("color")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(false)} title={t("personalOutlines.editor.toolbar.color")} onMouseDown={(e) => e.preventDefault()}>
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2 z-[120]">
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" className="h-6 w-6 rounded-md border border-border" style={{ backgroundColor: c }} onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().setColor(c).run(); closeAll(); }} aria-label={c} />
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().unsetColor().run(); closeAll(); }}>
              <RotateCcw className="h-3 w-3 mr-1" /> {t("personalOutlines.editor.toolbar.reset")}
            </Button>
          </PopoverContent>
        </Popover>

        {/* G5 — Marca-texto */}
        <Popover open={openG("hl")} onOpenChange={setG("hl")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(isActive("highlight"))} title={t("personalOutlines.editor.toolbar.highlight")} onMouseDown={(e) => e.preventDefault()}>
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2 z-[120]">
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} type="button" className="h-6 w-6 rounded-md border border-border" style={{ backgroundColor: c }} onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); closeAll(); }} aria-label={c} />
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().unsetHighlight().run(); closeAll(); }}>
              <RotateCcw className="h-3 w-3 mr-1" /> {t("personalOutlines.editor.toolbar.reset")}
            </Button>
          </PopoverContent>
        </Popover>

        {/* G6 — Listas + recuo */}
        <Popover open={openG("lists")} onOpenChange={setG("lists")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(isActive("bulletList") || isActive("orderedList") || isActive("taskList"))} title={t("personalOutlines.editor.toolbar.bullets")} onMouseDown={(e) => e.preventDefault()}>
              <List className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("bulletList"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.bullets")} onClick={() => { editor.chain().focus().toggleBulletList().run(); }}><List className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("orderedList"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.ordered")} onClick={() => { editor.chain().focus().toggleOrderedList().run(); }}><ListOrdered className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("taskList"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.tasks")} onClick={() => { editor.chain().focus().toggleTaskList().run(); }}><ListChecks className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.outdent")} onClick={() => {
              const chain = editor.chain().focus();
              if (isActive("listItem")) chain.liftListItem("listItem").run();
              else if (isActive("taskItem")) chain.liftListItem("taskItem").run();
              else (chain as unknown as { outdentBlock: () => typeof chain }).outdentBlock().run();
            }}><IndentDecrease className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.indent")} onClick={() => {
              const chain = editor.chain().focus();
              if (isActive("listItem")) chain.sinkListItem("listItem").run();
              else if (isActive("taskItem")) chain.sinkListItem("taskItem").run();
              else (chain as unknown as { indentBlock: () => typeof chain }).indentBlock().run();
            }}><IndentIncrease className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G7 — Alinhamento */}
        <Popover open={openG("align")} onOpenChange={setG("align")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(false)} title={t("personalOutlines.editor.toolbar.alignLeft")} onMouseDown={(e) => e.preventDefault()}>
              <AlignLeft className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive({ textAlign: "left" } as never))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.alignLeft")} onClick={() => { editor.chain().focus().setTextAlign("left").run(); closeAll(); }}><AlignLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive({ textAlign: "center" } as never))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.alignCenter")} onClick={() => { editor.chain().focus().setTextAlign("center").run(); closeAll(); }}><AlignCenter className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive({ textAlign: "right" } as never))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.alignRight")} onClick={() => { editor.chain().focus().setTextAlign("right").run(); closeAll(); }}><AlignRight className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive({ textAlign: "justify" } as never))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.alignJustify")} onClick={() => { editor.chain().focus().setTextAlign("justify").run(); closeAll(); }}><AlignJustify className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G8 — Inserir (link, tabela, hr, code) */}
        <Popover open={openG("insert")} onOpenChange={setG("insert")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(isActive("link") || isActive("table") || isActive("code") || isActive("codeBlock"))} title={t("personalOutlines.editor.toolbar.link")} onMouseDown={(e) => e.preventDefault()}>
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("link"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.link")} onClick={() => { closeAll(); promptLink(); }}><Link2 className="h-4 w-4" /></Button>
            {isActive("link") && (
              <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.unlink")} onClick={() => { editor.chain().focus().unsetLink().run(); closeAll(); }}><Link2Off className="h-4 w-4" /></Button>
            )}
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("table"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.insertTable")} onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); closeAll(); }}><TableIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.hr")} onClick={() => { editor.chain().focus().setHorizontalRule().run(); closeAll(); }}><Divider className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("code"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.code")} onClick={() => { editor.chain().focus().toggleCode().run(); closeAll(); }}><Code className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(isActive("codeBlock"))} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.codeBlock")} onClick={() => { editor.chain().focus().toggleCodeBlock().run(); closeAll(); }}><Code2 className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G9 — Tabela (edição de células, só visível quando dentro) */}
        <Popover open={openG("tableEdit")} onOpenChange={setG("tableEdit")}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={groupBtn(isActive("table"))} title={t("personalOutlines.editor.toolbar.table")} onMouseDown={(e) => e.preventDefault()} disabled={!isActive("table")}>
              <TableIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {popoverContent(<>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.addRow")} onClick={() => editor.chain().focus().addRowAfter().run()}><Plus className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.addCol")} onClick={() => editor.chain().focus().addColumnAfter().run()}><Plus className="h-4 w-4 rotate-90" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.delRow")} onClick={() => editor.chain().focus().deleteRow().run()}><Minus className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={itemBtn(false)} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.delCol")} onClick={() => editor.chain().focus().deleteColumn().run()}><Minus className="h-4 w-4 rotate-90" /></Button>
            <Button type="button" variant="ghost" size="sm" className={cn(itemBtn(false), "text-destructive")} onMouseDown={(e) => e.preventDefault()} title={t("personalOutlines.editor.toolbar.delTable")} onClick={() => { editor.chain().focus().deleteTable().run(); closeAll(); }}><Trash2 className="h-4 w-4" /></Button>
          </>)}
        </Popover>

        {/* G10 — Modo foco */}
        {onToggleFocusMode ? (
          <Button type="button" variant="ghost" size="sm" className={groupBtn(focusMode)}
            title={t("personalOutlines.editor.toolbar.focusMode", { defaultValue: "Modo foco" })}
            aria-pressed={focusMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleFocusMode}>
            <Focus className="h-4 w-4" />
          </Button>
        ) : <div />}
      </div>
    );
  }

  return (

    <div
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center gap-1 rounded-t-md border-b bg-background/95 backdrop-blur px-2 py-1.5 transition-all",
        !visible && "opacity-0 pointer-events-none -translate-y-1",
      )}
      onMouseDown={(e) => e.preventDefault()}
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

      {/* Fonte */}
      <Popover open={fontOpen} onOpenChange={setFontOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btn(false)}
            title={t("personalOutlines.editor.toolbar.fontFamily")}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Type className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1 z-[120]" align="start">
          {FONT_FAMILIES.map((f) => (
            <Button
              key={f.label}
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (f.value) {
                  editor.chain().focus().setFontFamily(f.value).run();
                } else {
                  editor.chain().focus().unsetFontFamily().run();
                }
                setFontOpen(false);
              }}
            >
              <span style={{ fontFamily: f.value || undefined }}>
                {f.label}
              </span>
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      {sep}

      {/* Formatação inline */}
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
        className={btn(isActive("underline"))}
        title={t("personalOutlines.editor.toolbar.underline")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("subscript"))}
        title={t("personalOutlines.editor.toolbar.subscript")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <SubIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("superscript"))}
        title={t("personalOutlines.editor.toolbar.superscript")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <SupIcon className="h-4 w-4" />
      </Button>

      {sep}

      {/* Listas */}
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("orderedList"))}
        title={t("personalOutlines.editor.toolbar.ordered")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("taskList"))}
        title={t("personalOutlines.editor.toolbar.tasks")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks className="h-4 w-4" />
      </Button>

      {sep}

      {/* Recuo / tabulação */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(false)}
        title={t("personalOutlines.editor.toolbar.outdent")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const chain = editor.chain().focus();
          // Se estiver em lista, prefere liftListItem (Tab nativo).
          if (isActive("listItem")) chain.liftListItem("listItem").run();
          else if (isActive("taskItem")) chain.liftListItem("taskItem").run();
          else (chain as unknown as { outdentBlock: () => typeof chain }).outdentBlock().run();
        }}
      >
        <IndentDecrease className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(false)}
        title={t("personalOutlines.editor.toolbar.indent")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const chain = editor.chain().focus();
          if (isActive("listItem")) chain.sinkListItem("listItem").run();
          else if (isActive("taskItem")) chain.sinkListItem("taskItem").run();
          else (chain as unknown as { indentBlock: () => typeof chain }).indentBlock().run();
        }}
      >
        <IndentIncrease className="h-4 w-4" />
      </Button>

      {sep}

      {/* Alinhamento */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive({ textAlign: "left" } as never))}
        title={t("personalOutlines.editor.toolbar.alignLeft")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive({ textAlign: "center" } as never))}
        title={t("personalOutlines.editor.toolbar.alignCenter")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive({ textAlign: "right" } as never))}
        title={t("personalOutlines.editor.toolbar.alignRight")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive({ textAlign: "justify" } as never))}
        title={t("personalOutlines.editor.toolbar.alignJustify")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      {sep}

      {/* Citação / código / divisor */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("blockquote"))}
        title={t("personalOutlines.editor.toolbar.blockquote")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("code"))}
        title={t("personalOutlines.editor.toolbar.code")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("codeBlock"))}
        title={t("personalOutlines.editor.toolbar.codeBlock")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(false)}
        title={t("personalOutlines.editor.toolbar.hr")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Divider className="h-4 w-4" />
      </Button>

      {sep}

      {/* Link */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn(isActive("link"))}
        title={t("personalOutlines.editor.toolbar.link")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={promptLink}
      >
        <Link2 className="h-4 w-4" />
      </Button>
      {isActive("link") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(false)}
          title={t("personalOutlines.editor.toolbar.unlink")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off className="h-4 w-4" />
        </Button>
      )}

      {sep}

      {/* Tabela */}
      <Popover open={tableOpen} onOpenChange={setTableOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btn(isActive("table"))}
            title={t("personalOutlines.editor.toolbar.table")}
            onMouseDown={(e) => e.preventDefault()}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 z-[120]" align="start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
              setTableOpen(false);
            }}
          >
            <TableIcon className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.insertTable")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            disabled={!isActive("table")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.addRow")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            disabled={!isActive("table")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.addCol")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            disabled={!isActive("table")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <Minus className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.delRow")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            disabled={!isActive("table")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <Minus className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.delCol")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs text-destructive"
            disabled={!isActive("table")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              setTableOpen(false);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            {t("personalOutlines.editor.toolbar.delTable")}
          </Button>
        </PopoverContent>
      </Popover>

      {sep}

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
            <RotateCcw className="h-3 w-3 mr-1" />
            {t("personalOutlines.editor.toolbar.reset")}
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
            <RotateCcw className="h-3 w-3 mr-1" />
            {t("personalOutlines.editor.toolbar.reset")}
          </Button>
        </PopoverContent>
      </Popover>

      {onToggleFocusMode && (
        <>
          {sep}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btn(focusMode)}
            title={t("personalOutlines.editor.toolbar.focusMode", {
              defaultValue: "Modo foco",
            })}
            aria-pressed={focusMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleFocusMode}
          >
            <Focus className="h-4 w-4" />
          </Button>
        </>
      )}

      {outlineId && (
        <>
          <div className="flex-1" aria-hidden />
          {sep}
          <OutlineTimer outlineId={outlineId} variant="toolbar" />
        </>
      )}
    </div>
  );
}
