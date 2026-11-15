import { appPrompt } from "@/components/ui/app-dialogs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  ArrowRightFromLine,
  WrapText,
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
  Focus,
  ListCollapse,
  Timer,
  ImagePlus,
  Video,
  Link as LinkExternalIcon,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  Ellipsis,
  Search,
  Eraser,
  ArrowUp,
  ArrowDown,
  CircleMinus,
  CirclePlus,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OutlineTimer } from "./OutlineTimer";
import { FONT_SIZE_OPTIONS, normalizeFontSize } from "./extensions/font-size";
import { HIGHLIGHT_COLORS } from "@/lib/highlight-palette";
import { firstLineMode } from "@/lib/first-line-indent";
import {
  DEFAULT_TOOLBAR,
  TOOLBAR_ITEM_IDS,
  readLastHighlight,
  saveLastHighlight,
  saveToolbar,
  useToolbarItems,
  type ToolbarItemId,
} from "@/lib/note-toolbar-prefs";
import { useAuthOptional } from "@/hooks/use-auth";
import { readGuestSession } from "@/lib/guest-session";
import { wsSessionKey } from "@/lib/guest-workspace-store";

const TEXT_COLORS = [
  "#0f172a", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#0891b2", "#2563eb", "#7c3aed",
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
  /** Quando presente, mostra o cronômetro do esboço no fim da barra. */
  outlineId?: string;
  /** Mantido por compatibilidade: a barra agora é sempre de uma linha. */
  compact?: boolean;
  onAddPhotoAttachment?: () => void;
  onAddLinkAttachment?: () => void;
  onAddVideoAttachment?: () => void;
  /** Abre a barra de Localizar e substituir (do editor). */
  onOpenSearch?: () => void;
}

type SheetKind = "aa" | "more" | "customize" | null;

interface Item {
  icon: ReactNode;
  label: string;
  run: () => void;
  active?: boolean;
  disabled?: boolean;
  /** false = não existe nesta tela (ex.: anexos no estudo pessoal). */
  available?: boolean;
}

/** Escopo da barra personalizada: conta, código de convite ou aparelho. */
function useToolbarScope(): string {
  const auth = useAuthOptional();
  const [guest, setGuest] = useState<string | null>(null);
  useEffect(() => {
    try {
      const code = readGuestSession()?.code;
      setGuest(code ? wsSessionKey(code) : null);
    } catch {
      setGuest(null);
    }
  }, []);
  if (auth?.user?.id) return `u.${auth.user.id}`;
  if (guest) return `g.${guest}`;
  return "device";
}

const keep = (e: { preventDefault: () => void }) => e.preventDefault();

export function RichNoteToolbar({
  editor,
  visible = true,
  focusMode = false,
  onToggleFocusMode,
  outlineId,
  onAddPhotoAttachment,
  onAddLinkAttachment,
  onAddVideoAttachment,
  onOpenSearch,
}: ToolbarProps) {
  const { t } = useTranslation();
  const scope = useToolbarScope();
  const barIds = useToolbarItems(scope);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [lastHl, setLastHl] = useState<string>(HIGHLIGHT_COLORS[0]);
  const [, force] = useState(0);
  const longPress = useRef<{ timer: number | null; fired: boolean }>({ timer: null, fired: false });

  useEffect(() => setLastHl(readLastHighlight()), []);

  // Estado aceso dos botões acompanha o cursor (sem ouvir cada tecla).
  useEffect(() => {
    if (!editor) return;
    const upd = () => force((n) => (n + 1) % 1_000_000);
    editor.on("selectionUpdate", upd);
    editor.on("update", upd);
    return () => {
      editor.off("selectionUpdate", upd);
      editor.off("update", upd);
    };
  }, [editor]);

  if (!editor) return null;

  const tt = (k: string, d: string, o?: Record<string, unknown>) =>
    t(`personalOutlines.editor.toolbar.${k}`, { defaultValue: d, ...o }) as string;
  const isActive = (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) =>
    typeof name === "string" ? editor.isActive(name, attrs) : editor.isActive(name);
  const chain = () => editor.chain().focus();
  type Custom = { run: () => boolean } & Record<string, () => Custom>;
  const custom = (cmd: "indentBlock" | "outdentBlock" | "cycleFirstLine") =>
    (chain() as unknown as Record<string, () => Custom>)[cmd]().run();

  const fl = Number(editor.getAttributes("paragraph").firstLine || editor.getAttributes("heading").firstLine || 0);
  const flMode = firstLineMode(fl);
  const flLabel =
    flMode === "first" ? tt("firstLineFirst", "Recuo: 1ª linha") : flMode === "hanging" ? tt("firstLineHanging", "Recuo: deslocado") : tt("firstLineNone", "Recuo: normal");

  const promptLink = async () => {
    const prev = (editor.getAttributes("link") as { href?: string }).href ?? "";
    const url = await appPrompt(t("personalOutlines.editor.toolbar.linkPrompt"), prev, { allowEmpty: true });
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const createTopic = async () => {
    const title = await appPrompt(t("personalOutlines.topics.titlePrompt", { defaultValue: "Título do tópico" }), "");
    if (title === null) return;
    editor.chain().focus().setOutlineTopic(title.trim() || t("personalOutlines.topics.defaultTitle", { defaultValue: "Tópico" })).run();
  };

  const toggleQuickHighlight = () => {
    if (isActive("highlight")) chain().unsetHighlight().run();
    else chain().setHighlight({ color: lastHl }).run();
  };
  const pickHighlight = (c: string) => {
    saveLastHighlight(c);
    setLastHl(c);
    chain().setHighlight({ color: c }).run();
  };

  const outdent = () => {
    if (isActive("listItem")) chain().liftListItem("listItem").run();
    else if (isActive("taskItem")) chain().liftListItem("taskItem").run();
    else custom("outdentBlock");
  };
  const indent = () => {
    if (isActive("listItem")) chain().sinkListItem("listItem").run();
    else if (isActive("taskItem")) chain().sinkListItem("taskItem").run();
    else custom("indentBlock");
  };

  const ic = "h-5 w-5";
  const items: Record<ToolbarItemId, Item> = {
    redo: { icon: <Redo2 className={ic} />, label: tt("redo", "Refazer"), run: () => chain().redo().run(), disabled: !editor.can().redo() },
    bold: { icon: <Bold className={ic} />, label: tt("bold", "Negrito"), run: () => chain().toggleBold().run(), active: isActive("bold") },
    italic: { icon: <Italic className={ic} />, label: tt("italic", "Itálico"), run: () => chain().toggleItalic().run(), active: isActive("italic") },
    underline: { icon: <UnderlineIcon className={ic} />, label: tt("underline", "Sublinhado"), run: () => chain().toggleUnderline().run(), active: isActive("underline") },
    highlight: {
      icon: (
        <span className="relative inline-flex">
          <Highlighter className={ic} />
          <span aria-hidden className="absolute -bottom-1 left-0.5 right-0.5 h-1 rounded-full" style={{ backgroundColor: lastHl }} />
        </span>
      ),
      label: tt("highlight", "Marca-texto"),
      run: toggleQuickHighlight,
      active: isActive("highlight"),
    },
    bulletList: { icon: <List className={ic} />, label: tt("bullets", "Lista com marcadores"), run: () => chain().toggleBulletList().run(), active: isActive("bulletList") },
    orderedList: { icon: <ListOrdered className={ic} />, label: tt("ordered", "Lista numerada"), run: () => chain().toggleOrderedList().run(), active: isActive("orderedList") },
    taskList: { icon: <ListChecks className={ic} />, label: tt("tasks", "Lista de tarefas"), run: () => chain().toggleTaskList().run(), active: isActive("taskList") },
    outdent: { icon: <IndentDecrease className={ic} />, label: tt("outdent", "Diminuir recuo"), run: outdent },
    indent: { icon: <IndentIncrease className={ic} />, label: tt("indent", "Aumentar recuo"), run: indent },
    firstLine: {
      icon: flMode === "hanging" ? <WrapText className={ic} /> : <ArrowRightFromLine className={ic} />,
      label: flLabel,
      run: () => custom("cycleFirstLine"),
      active: flMode !== "none",
    },
    heading2: { icon: <Heading2 className={ic} />, label: tt("title", "Título"), run: () => chain().toggleHeading({ level: 2 }).run(), active: isActive("heading", { level: 2 }) },
    heading3: { icon: <Heading3 className={ic} />, label: tt("subtitle", "Subtítulo"), run: () => chain().toggleHeading({ level: 3 }).run(), active: isActive("heading", { level: 3 }) },
    blockquote: { icon: <Quote className={ic} />, label: tt("blockquote", "Citação"), run: () => chain().toggleBlockquote().run(), active: isActive("blockquote") },
    subscript: { icon: <SubIcon className={ic} />, label: tt("subscript", "Subscrito"), run: () => chain().toggleSubscript().run(), active: isActive("subscript") },
    superscript: { icon: <SupIcon className={ic} />, label: tt("superscript", "Sobrescrito"), run: () => chain().toggleSuperscript().run(), active: isActive("superscript") },
    color: { icon: <Palette className={ic} />, label: tt("color", "Cor do texto"), run: () => setSheet("aa") },
    alignLeft: { icon: <AlignLeft className={ic} />, label: tt("alignLeft", "Alinhar à esquerda"), run: () => chain().setTextAlign("left").run(), active: isActive({ textAlign: "left" }) },
    alignCenter: { icon: <AlignCenter className={ic} />, label: tt("alignCenter", "Centralizar"), run: () => chain().setTextAlign("center").run(), active: isActive({ textAlign: "center" }) },
    alignRight: { icon: <AlignRight className={ic} />, label: tt("alignRight", "Alinhar à direita"), run: () => chain().setTextAlign("right").run(), active: isActive({ textAlign: "right" }) },
    alignJustify: { icon: <AlignJustify className={ic} />, label: tt("alignJustify", "Justificar"), run: () => chain().setTextAlign("justify").run(), active: isActive({ textAlign: "justify" }) },
    link: { icon: <Link2 className={ic} />, label: tt("link", "Inserir/editar link"), run: () => void promptLink(), active: isActive("link") },
    table: { icon: <TableIcon className={ic} />, label: tt("insertTable", "Inserir tabela 3x3"), run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), active: isActive("table") },
    hr: { icon: <Divider className={ic} />, label: tt("hr", "Linha divisória"), run: () => chain().setHorizontalRule().run() },
    code: { icon: <Code className={ic} />, label: tt("code", "Código embutido"), run: () => chain().toggleCode().run(), active: isActive("code") },
    codeBlock: { icon: <Code2 className={ic} />, label: tt("codeBlock", "Bloco de código"), run: () => chain().toggleCodeBlock().run(), active: isActive("codeBlock") },
    clearFormat: { icon: <Eraser className={ic} />, label: tt("clearFormat", "Limpar formatação"), run: () => chain().unsetAllMarks().run() },
    topic: {
      icon: <ListCollapse className={ic} />,
      label: t("personalOutlines.topics.create", { defaultValue: "Criar tópico" }),
      run: () => void createTopic(),
    },
    convertHeadings: {
      icon: <Timer className={ic} />,
      label: t("personalOutlines.topics.convertHeadings", { defaultValue: "Converter subtítulos em tópicos com tempo" }),
      run: () => {
        const ok = editor.chain().focus().convertHeadingsToTopics().run();
        if (!ok) window.alert(t("personalOutlines.topics.noHeadings", { defaultValue: "Nenhum subtítulo com tempo, como (4 min), foi encontrado." }));
      },
    },
    photo: { icon: <ImagePlus className={ic} />, label: t("personalOutlines.attachments.addPhoto", { defaultValue: "Anexar imagem" }), run: () => onAddPhotoAttachment?.(), available: !!onAddPhotoAttachment },
    video: { icon: <Video className={ic} />, label: t("personalOutlines.attachments.addVideoFile", { defaultValue: "Anexar vídeo" }), run: () => onAddVideoAttachment?.(), available: !!onAddVideoAttachment },
    attachLink: { icon: <LinkExternalIcon className={ic} />, label: t("personalOutlines.attachments.addLink", { defaultValue: "Vincular link" }), run: () => onAddLinkAttachment?.(), available: !!onAddLinkAttachment },
    search: { icon: <Search className={ic} />, label: tt("search", "Localizar e substituir"), run: () => onOpenSearch?.(), available: !!onOpenSearch },
    focus: {
      icon: <Focus className={ic} />,
      label: t("personalOutlines.editor.toolbar.focusMode", { defaultValue: "Modo foco" }),
      run: () => onToggleFocusMode?.(),
      active: focusMode,
      available: !!onToggleFocusMode,
    },
  };

  const barBtn = (active?: boolean) =>
    cn(
      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors active:scale-95",
      "hover:bg-muted disabled:opacity-40",
      active && "bg-primary/10 text-primary",
    );

  const renderBarItem = (id: ToolbarItemId) => {
    const it = items[id];
    if (!it || it.available === false) return null;
    if (id === "highlight") {
      const lp = longPress.current;
      return (
        <button key={id} type="button" className={barBtn(it.active)} title={`${it.label} — ${tt("highlightHint", "segure para escolher a cor")}`}
          aria-label={it.label} aria-pressed={!!it.active}
          onMouseDown={keep}
          onContextMenu={keep}
          onPointerDown={() => {
            lp.fired = false;
            if (lp.timer) window.clearTimeout(lp.timer);
            lp.timer = window.setTimeout(() => { lp.fired = true; setSheet("aa"); }, 450);
          }}
          onPointerUp={() => { if (lp.timer) window.clearTimeout(lp.timer); lp.timer = null; }}
          onPointerLeave={() => { if (lp.timer) window.clearTimeout(lp.timer); lp.timer = null; }}
          onClick={() => { if (lp.fired) { lp.fired = false; return; } it.run(); }}>
          {it.icon}
        </button>
      );
    }
    return (
      <button key={id} type="button" className={barBtn(it.active)} title={it.label} aria-label={it.label}
        aria-pressed={it.active === undefined ? undefined : !!it.active} disabled={it.disabled}
        onMouseDown={keep} onClick={it.run}>
        {it.icon}
      </button>
    );
  };

  // Tile das folhas (ícone + rótulo, alvo de toque ≥ 44px).
  const tile = (key: string, it: Item, close = false) =>
    it.available === false ? null : (
      <button key={key} type="button" disabled={it.disabled}
        aria-pressed={it.active === undefined ? undefined : !!it.active}
        className={cn(
          "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-muted/60 px-1 py-2 text-[11px] leading-tight text-foreground transition-colors active:scale-95 disabled:opacity-40",
          it.active && "bg-primary/10 text-primary ring-1 ring-primary/30",
        )}
        onMouseDown={keep}
        onClick={() => { it.run(); if (close) setSheet(null); }}>
        {it.icon}
        <span className="line-clamp-2 text-center">{it.label}</span>
      </button>
    );

  const section = (title: string, children: ReactNode) => (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
  const grid = (children: ReactNode) => <div className="grid grid-cols-4 gap-2">{children}</div>;

  // ===== "Aa": estilo, tamanho, fonte, cor e marca-texto =====
  const fontSizeNow = normalizeFontSize((editor.getAttributes("textStyle") as { fontSize?: string | null }).fontSize ?? null);
  const sizeNum = fontSizeNow ? parseInt(fontSizeNow, 10) : null;
  const stepSize = (dir: 1 | -1) => {
    const list = FONT_SIZE_OPTIONS as readonly number[];
    const cur = sizeNum ?? 16;
    const idx = list.findIndex((n) => n >= cur);
    const base = idx < 0 ? list.length - 1 : idx;
    const next = list[Math.min(list.length - 1, Math.max(0, base + dir))];
    chain().setFontSize(`${next}px`).run();
  };
  const blockValue = isActive("heading", { level: 2 }) ? "h2" : isActive("heading", { level: 3 }) ? "h3" : isActive("blockquote") ? "quote" : "p";
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors active:scale-95",
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground",
    );
  const swatch = "h-9 w-9 rounded-full border border-border shadow-sm active:scale-95";

  const aaSheet = (
    <div className="space-y-5">
      {section(tt("sectionStyle", "Estilo"), (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(blockValue === "p")} onMouseDown={keep} onClick={() => chain().setParagraph().run()}><Pilcrow className="h-4 w-4" />{tt("normal", "Texto normal")}</button>
          <button type="button" className={chip(blockValue === "h2")} onMouseDown={keep} onClick={() => chain().setNode("heading", { level: 2 }).run()}><Heading2 className="h-4 w-4" />{tt("title", "Título")}</button>
          <button type="button" className={chip(blockValue === "h3")} onMouseDown={keep} onClick={() => chain().setNode("heading", { level: 3 }).run()}><Heading3 className="h-4 w-4" />{tt("subtitle", "Subtítulo")}</button>
          <button type="button" className={chip(blockValue === "quote")} onMouseDown={keep} onClick={() => chain().toggleBlockquote().run()}><Quote className="h-4 w-4" />{tt("blockquote", "Citação")}</button>
        </div>
      ))}
      {section(tt("sectionSize", "Tamanho da letra"), (
        <div className="flex items-center gap-2">
          <button type="button" className={cn(chip(false), "w-14 justify-center whitespace-nowrap text-base")} aria-label={tt("sizeDown", "Diminuir letra")} onMouseDown={keep} onClick={() => stepSize(-1)}>A−</button>
          <div className="min-w-[72px] text-center text-sm font-medium tabular-nums">{sizeNum ?? tt("sizeDefault", "Padrão")}</div>
          <button type="button" className={cn(chip(false), "w-14 justify-center whitespace-nowrap text-lg")} aria-label={tt("sizeUp", "Aumentar letra")} onMouseDown={keep} onClick={() => stepSize(1)}>A+</button>
          <button type="button" className={cn(chip(false), "ml-auto")} onMouseDown={keep} onClick={() => chain().unsetFontSize().run()}><RotateCcw className="h-3.5 w-3.5" />{tt("sizeDefault", "Padrão")}</button>
        </div>
      ))}
      {section(tt("fontFamily", "Fonte"), (
        <div className="flex flex-wrap gap-2">
          {FONT_FAMILIES.map((f) => (
            <button key={f.label} type="button" className={chip(f.value ? isActive("textStyle", { fontFamily: f.value }) : false)} onMouseDown={keep}
              onClick={() => (f.value ? chain().setFontFamily(f.value).run() : chain().unsetFontFamily().run())}>
              <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
            </button>
          ))}
        </div>
      ))}
      {section(tt("color", "Cor do texto"), (
        <div className="flex flex-wrap items-center gap-2.5">
          {TEXT_COLORS.map((c) => (
            <button key={c} type="button" className={swatch} style={{ backgroundColor: c }} aria-label={c} onMouseDown={keep} onClick={() => chain().setColor(c).run()} />
          ))}
          <button type="button" className={chip(false)} onMouseDown={keep} onClick={() => chain().unsetColor().run()}><RotateCcw className="h-3.5 w-3.5" />{tt("reset", "Remover formatação")}</button>
        </div>
      ))}
      {section(tt("highlight", "Marca-texto"), (
        <div className="flex flex-wrap items-center gap-2.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" className={cn(swatch, c === lastHl && "ring-2 ring-primary ring-offset-2 ring-offset-background")} style={{ backgroundColor: c }} aria-label={c}
              onMouseDown={keep} onClick={() => pickHighlight(c)} />
          ))}
          <button type="button" className={chip(false)} onMouseDown={keep} onClick={() => chain().unsetHighlight().run()}><RotateCcw className="h-3.5 w-3.5" />{tt("reset", "Remover formatação")}</button>
        </div>
      ))}
    </div>
  );

  // ===== "⋯": todo o resto, agrupado =====
  const inTable = isActive("table");
  const moreSheet = (
    <div className="space-y-5">
      {section(tt("sectionText", "Texto"), grid(<>
        {tile("b", items.bold)}{tile("i", items.italic)}{tile("u", items.underline)}{tile("hl", items.highlight)}
        {tile("sub", items.subscript)}{tile("sup", items.superscript)}{tile("code", items.code)}{tile("clr", items.clearFormat)}
      </>))}
      {section(tt("sectionParagraph", "Parágrafo"), grid(<>
        {tile("al", items.alignLeft)}{tile("ac", items.alignCenter)}{tile("ar", items.alignRight)}{tile("aj", items.alignJustify)}
        {tile("ul", items.bulletList)}{tile("ol", items.orderedList)}{tile("tl", items.taskList)}{tile("fl", items.firstLine)}
        {tile("out", items.outdent)}{tile("in", items.indent)}{tile("h2", items.heading2)}{tile("h3", items.heading3)}
        {tile("q", items.blockquote)}{tile("cb", items.codeBlock)}
      </>))}
      {section(tt("sectionInsert", "Inserir"), grid(<>
        {tile("photo", items.photo, true)}{tile("video", items.video, true)}{tile("al2", items.attachLink, true)}
        {tile("link", items.link, true)}
        {isActive("link") && tile("unlink", { icon: <Link2Off className={ic} />, label: tt("unlink", "Remover link"), run: () => chain().unsetLink().run() })}
        {tile("table", items.table)}{tile("hr", items.hr)}{tile("topic", items.topic, true)}{tile("conv", items.convertHeadings)}
      </>))}
      {inTable && section(tt("table", "Tabela"), grid(<>
        {tile("ar", { icon: <Plus className={ic} />, label: tt("addRow", "Adicionar linha"), run: () => chain().addRowAfter().run() })}
        {tile("ac", { icon: <Plus className={cn(ic, "rotate-90")} />, label: tt("addCol", "Adicionar coluna"), run: () => chain().addColumnAfter().run() })}
        {tile("dr", { icon: <Minus className={ic} />, label: tt("delRow", "Remover linha"), run: () => chain().deleteRow().run() })}
        {tile("dc", { icon: <Minus className={cn(ic, "rotate-90")} />, label: tt("delCol", "Remover coluna"), run: () => chain().deleteColumn().run() })}
        {tile("dt", { icon: <Trash2 className={cn(ic, "text-destructive")} />, label: tt("delTable", "Excluir tabela"), run: () => chain().deleteTable().run() }, true)}
      </>))}
      {section(tt("sectionTools", "Ferramentas"), grid(<>
        {tile("search", items.search, true)}
        {tile("focus", items.focus, true)}
        {tile("custom", { icon: <SlidersHorizontal className={ic} />, label: tt("customize", "Personalizar barra"), run: () => setSheet("customize") })}
      </>))}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-20 rounded-t-md border-b bg-background px-1 py-1 transition-all",
          !visible && "pointer-events-none -translate-y-1 opacity-0",
        )}
        onMouseDown={keep}
      >
        <div className="flex items-center gap-0.5">
          <button type="button" className={barBtn()} title={tt("undo", "Desfazer")} aria-label={tt("undo", "Desfazer")}
            disabled={!editor.can().undo()} onMouseDown={keep} onClick={() => chain().undo().run()}>
            <Undo2 className={ic} />
          </button>
          <div className="w-px self-stretch my-2 bg-border shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <ScrollRow>
              {barIds.map(renderBarItem)}
              {outlineId && (
                <>
                  <div className="min-w-2 flex-1" aria-hidden />
                  <OutlineTimer outlineId={outlineId} variant="toolbar" />
                </>
              )}
            </ScrollRow>
          </div>
          <div className="w-px self-stretch my-2 bg-border shrink-0" aria-hidden />
          <button type="button" className={cn(barBtn(sheet === "aa"), "text-base font-semibold")} title={tt("styles", "Estilo, tamanho e cor")}
            aria-label={tt("styles", "Estilo, tamanho e cor")} aria-expanded={sheet === "aa"} onMouseDown={keep}
            onClick={() => setSheet((s) => (s === "aa" ? null : "aa"))}>
            Aa
          </button>
          <button type="button" className={barBtn(sheet === "more" || sheet === "customize")} title={tt("more", "Mais ferramentas")}
            aria-label={tt("more", "Mais ferramentas")} aria-expanded={sheet === "more"} onMouseDown={keep}
            onClick={() => setSheet((s) => (s === "more" ? null : "more"))}>
            <Ellipsis className={ic} />
          </button>
        </div>
      </div>

      <ToolSheet open={sheet === "aa"} title={tt("styles", "Estilo, tamanho e cor")} onClose={() => setSheet(null)} closeLabel={tt("done", "OK")}>
        {aaSheet}
      </ToolSheet>
      <ToolSheet open={sheet === "more"} title={tt("more", "Mais ferramentas")} onClose={() => setSheet(null)} closeLabel={tt("done", "OK")}>
        {moreSheet}
      </ToolSheet>
      {sheet === "customize" && (
        <CustomizeSheet
          initial={barIds}
          items={items}
          onCancel={() => setSheet("more")}
          onSave={(ids) => { saveToolbar(scope, ids); setSheet(null); }}
        />
      )}
    </>
  );
}

/** Personalizar a barra fixa: tirar/pôr botões e mudar a ordem (↑/↓). */
function CustomizeSheet({ initial, items, onCancel, onSave }: {
  initial: ToolbarItemId[];
  items: Record<ToolbarItemId, Item>;
  onCancel: () => void;
  onSave: (ids: ToolbarItemId[] | null) => void;
}) {
  const { t } = useTranslation();
  const tt = (k: string, d: string) => t(`personalOutlines.editor.toolbar.${k}`, { defaultValue: d }) as string;
  const [list, setList] = useState<ToolbarItemId[]>(initial);
  const [reset, setReset] = useState(false);
  const available = TOOLBAR_ITEM_IDS.filter((id) => !list.includes(id) && items[id]?.available !== false);
  const move = (i: number, d: -1 | 1) =>
    setList((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const rowCls = "flex min-h-[48px] items-center gap-3 px-3";
  const iconBtn = "inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:scale-95 disabled:opacity-30";

  return (
    <ToolSheet open title={tt("customizeTitle", "Barra fixa")} onClose={onCancel}
      closeLabel={tt("cancel", "Cancelar")}
      action={<button type="button" className="text-sm font-semibold text-primary" onMouseDown={keep} onClick={() => onSave(reset && sameList(list, DEFAULT_TOOLBAR) ? null : list)}>{tt("done", "OK")}</button>}>
      <div className="space-y-5">
        <p className="px-1 text-xs text-muted-foreground">{tt("alwaysOnBar", "Desfazer, Aa e ⋯ ficam sempre na barra.")}</p>
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tt("onBar", "Na barra")}</h3>
          <ul className="divide-y overflow-hidden rounded-2xl bg-muted/60">
            {list.length === 0 && <li className={cn(rowCls, "text-sm text-muted-foreground")}>{tt("emptyBar", "Nenhum botão. Toque em + para adicionar.")}</li>}
            {list.map((id, i) => {
              const it = items[id];
              if (!it) return null;
              return (
                <li key={id} className={rowCls}>
                  <button type="button" className={cn(iconBtn, "text-destructive")} aria-label={`${tt("remove", "Tirar da barra")}: ${it.label}`} onMouseDown={keep} onClick={() => setList((l) => l.filter((x) => x !== id))}>
                    <CircleMinus className="h-5 w-5" />
                  </button>
                  <span className="shrink-0 text-foreground">{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{it.label}{it.available === false && <span className="ml-1 text-xs text-muted-foreground">({tt("notHere", "não aparece nesta tela")})</span>}</span>
                  <button type="button" className={iconBtn} disabled={i === 0} aria-label={`${tt("moveUp", "Subir")}: ${it.label}`} onMouseDown={keep} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className={iconBtn} disabled={i === list.length - 1} aria-label={`${tt("moveDown", "Descer")}: ${it.label}`} onMouseDown={keep} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        </section>
        {available.length > 0 && (
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tt("available", "Disponíveis")}</h3>
            <ul className="divide-y overflow-hidden rounded-2xl bg-muted/60">
              {available.map((id) => (
                <li key={id} className={rowCls}>
                  <button type="button" className={cn(iconBtn, "text-primary")} aria-label={`${tt("add", "Pôr na barra")}: ${items[id].label}`} onMouseDown={keep} onClick={() => setList((l) => [...l, id])}>
                    <CirclePlus className="h-5 w-5" />
                  </button>
                  <span className="shrink-0 text-foreground">{items[id].icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{items[id].label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <button type="button" className="w-full rounded-2xl bg-muted/60 py-3 text-sm font-medium text-primary active:scale-[0.99]" onMouseDown={keep}
          onClick={() => { setList([...DEFAULT_TOOLBAR]); setReset(true); }}>
          {tt("restoreDefault", "Restaurar padrão")}
        </button>
      </div>
    </ToolSheet>
  );
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Folha que sobe de baixo (One UI / iOS), sem tirar o foco do editor:
 * não é um diálogo modal, então o teclado e a seleção continuam como estão.
 * Fecha tocando fora, no botão do topo ou arrastando a alça para baixo.
 */
function ToolSheet({ open, title, onClose, closeLabel, action, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [dy, setDy] = useState(0);
  const drag = useRef<{ y: number; id: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => { if (!open) setDy(0); }, [open]);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[125]" onMouseDown={keep} onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-foreground/10" aria-hidden onPointerDown={(e) => { e.preventDefault(); onClose(); }} />
      <div
        role="dialog"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[62dvh] w-full max-w-lg flex-col rounded-t-3xl border border-b-0 bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom duration-200"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="touch-none select-none px-4 pb-2 pt-2"
          onPointerDown={(e) => {
            // Botões do topo (OK/Cancelar) recebem o toque normalmente.
            if ((e.target as HTMLElement).closest("button")) return;
            drag.current = { y: e.clientY, id: e.pointerId };
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => { const d = drag.current; if (d && d.id === e.pointerId) setDy(Math.max(0, e.clientY - d.y)); }}
          onPointerUp={() => { const close = dy > 80; drag.current = null; setDy(0); if (close) onClose(); }}
          onPointerCancel={() => { drag.current = null; setDy(0); }}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className="flex items-center gap-2">
            <button type="button" className="min-h-[36px] text-sm text-primary" onMouseDown={keep} onClick={onClose}>{closeLabel}</button>
            <h2 className="flex-1 truncate text-center text-sm font-semibold">{title}</h2>
            <div className="flex min-w-[48px] justify-end">{action}</div>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-5 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Fila com rolagem lateral: dedo (nativo), arrastar com mouse, rodinha e setas. */
function ScrollRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const drag = useRef<{ x: number; sl: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className="relative min-w-0">
      <div
        ref={ref}
        className="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap no-scrollbar min-w-0"
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          drag.current = { x: e.clientX, sl: ref.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 5) d.moved = true;
          if (d.moved) ref.current.scrollLeft = d.sl - dx;
        }}
        onPointerUp={() => {
          suppressClick.current = !!drag.current?.moved;
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {children}
      </div>
      {edges.left && (
        <button
          type="button"
          aria-label="Rolar para a esquerda"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-0 bottom-0 flex w-6 items-center justify-start bg-gradient-to-r from-background via-background/80 to-transparent text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          aria-label="Rolar para a direita"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-0 bottom-0 flex w-6 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
