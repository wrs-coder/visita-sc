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
  ChevronUp,
  ChevronDown,
  CaseSensitive,
  X,
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
import { trayMaxHeight, type ToolbarDock } from "@/lib/editor-toolbar-dock";

// Paletas do Samsung Notes: dezenas de cores em grade de 2 linhas que
// rola para o lado. São dados de conteúdo (gravados na nota), não tema.
const TEXT_COLORS = [
  "#000000", "#0f172a", "#334155", "#64748b", "#94a3b8", "#ffffff",
  "#7f1d1d", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#be185d",
  "#db2777", "#ec4899", "#9a3412", "#c2410c", "#ea580c", "#f97316",
  "#a16207", "#ca8a04", "#eab308", "#3f6212", "#15803d", "#16a34a",
  "#22c55e", "#0f766e", "#0d9488", "#0e7490", "#0891b2", "#06b6d4",
  "#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#4338ca", "#6d28d9",
  "#7c3aed", "#8b5cf6", "#a21caf", "#c026d3",
];
const BG_COLORS = [
  ...HIGHLIGHT_COLORS,
  "#fef9c3", "#fde68a", "#fcd34d", "#ffedd5", "#fdba74", "#fee2e2",
  "#fca5a5", "#fce7f3", "#f9a8d4", "#fae8ff", "#f0abfc", "#ede9fe",
  "#c4b5fd", "#e0e7ff", "#a5b4fc", "#dbeafe", "#93c5fd", "#e0f2fe",
  "#7dd3fc", "#cffafe", "#67e8f9", "#ccfbf1", "#5eead4", "#dcfce7",
  "#86efac", "#ecfccb", "#bef264", "#f1f5f9", "#cbd5e1", "#d6d3d1",
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
  /**
   * Onde a barra fica: "keyboard" = colada em cima do teclado (fixa na tela),
   * "bottom" = no rodapé da área de texto, "hidden" = teclado de outro campo.
   */
  dock?: ToolbarDock;
  /** Altura escondida pelo teclado no navegador/iOS (0 no app Android). */
  keyboardInset?: number;
  /** Altura visível da tela agora (com o teclado aberto ou não). */
  visibleHeight?: number;
  /** Barra recolhida: mostra só a pílula "Aa Ferramentas". */
  collapsed?: boolean;
  /** Recolher/mostrar a barra (só nas telas que permitem recolher). */
  onToggleCollapsed?: () => void;
}

type SheetKind = "style" | "size" | "fontColor" | "bgColor" | "font" | "align" | "lists" | "more" | "customize" | null;

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
  dock = "bottom",
  keyboardInset = 0,
  visibleHeight = 0,
  collapsed = false,
  onToggleCollapsed,
}: ToolbarProps) {
  const { t } = useTranslation();
  const scope = useToolbarScope();
  const barIds = useToolbarItems(scope);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [lastHl, setLastHl] = useState<string>(HIGHLIGHT_COLORS[0]);
  const [, force] = useState(0);
  const longPress = useRef<{ timer: number | null; fired: boolean }>({ timer: null, fired: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => setLastHl(readLastHighlight()), []);
  useEffect(() => setMounted(true), []);
  // Esc fecha a faixa aberta (o teclado e a seleção continuam).
  useEffect(() => {
    if (!sheet || sheet === "customize") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

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
  // Uma faixa por vez: tocar no mesmo botão fecha.
  const toggleTray = (k: Exclude<SheetKind, null>) => setSheet((s) => (s === k ? null : k));
  const fontSizeNow = normalizeFontSize((editor.getAttributes("textStyle") as { fontSize?: string | null }).fontSize ?? null);
  const sizeNum = fontSizeNow ? parseInt(fontSizeNow, 10) : null;
  const textColorNow = (editor.getAttributes("textStyle") as { color?: string | null }).color || null;
  const bgNow = isActive("highlight") ? ((editor.getAttributes("highlight") as { color?: string | null }).color || lastHl) : null;
  const alignNow = (["center", "right", "justify"] as const).find((a) => isActive({ textAlign: a })) ?? "left";
  const AlignNowIcon = alignNow === "center" ? AlignCenter : alignNow === "right" ? AlignRight : alignNow === "justify" ? AlignJustify : AlignLeft;
  const ListNowIcon = isActive("orderedList") ? ListOrdered : isActive("taskList") ? ListChecks : List;
  const items: Record<ToolbarItemId, Item> = {
    style: {
      icon: <span className="text-base font-semibold leading-none">Aa</span>,
      label: tt("styleTray", "Estilo do parágrafo"),
      run: () => toggleTray("style"),
      active: sheet === "style",
    },
    size: {
      icon: (
        <span className="inline-flex items-center text-[13px] font-semibold tabular-nums leading-none">
          {sizeNum ?? 16}<ChevronDown className="h-3 w-3" />
        </span>
      ),
      label: tt("sizeTray", "Tamanho da fonte"),
      run: () => toggleTray("size"),
      active: sheet === "size",
    },
    fontColor: {
      icon: (
        <span className="relative inline-flex flex-col items-center">
          <span className="text-[17px] font-semibold leading-none">T</span>
          <span aria-hidden className="mt-0.5 h-1 w-5 rounded-full border border-border" style={{ backgroundColor: textColorNow ?? "currentColor" }} />
        </span>
      ),
      label: tt("fontColor", "Cor da fonte"),
      run: () => toggleTray("fontColor"),
      active: sheet === "fontColor",
    },
    bgColor: {
      icon: (
        <span className="relative inline-flex flex-col items-center">
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-current text-[12px] font-semibold leading-none">T</span>
          <span aria-hidden className="mt-0.5 h-1 w-5 rounded-full border border-border" style={{ backgroundColor: bgNow ?? lastHl }} />
        </span>
      ),
      label: tt("bgColor", "Cor do fundo"),
      run: () => toggleTray("bgColor"),
      active: sheet === "bgColor",
    },
    font: { icon: <CaseSensitive className={ic} />, label: tt("fontTray", "Fonte"), run: () => toggleTray("font"), active: sheet === "font" },
    align: { icon: <AlignNowIcon className={ic} />, label: tt("alignTray", "Alinhamento"), run: () => toggleTray("align"), active: sheet === "align" },
    lists: { icon: <ListNowIcon className={ic} />, label: tt("listsTray", "Listas e recuo"), run: () => toggleTray("lists"), active: sheet === "lists" },
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
    color: { icon: <Palette className={ic} />, label: tt("color", "Cor do texto"), run: () => toggleTray("fontColor") },
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
            lp.timer = window.setTimeout(() => { lp.fired = true; setSheet("bgColor"); }, 450);
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
          "flex h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-muted/60 px-0.5 py-1 text-[10px] leading-[1.15] text-foreground transition-colors active:scale-95 disabled:opacity-40",
          it.active && "bg-primary/10 text-primary ring-1 ring-primary/30",
        )}
        onMouseDown={keep}
        onClick={() => { it.run(); if (close) setSheet(null); }}>
        {it.icon}
        <span className="line-clamp-2 text-center">{it.label}</span>
      </button>
    );

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
      "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors active:scale-95",
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground",
    );
  const sameColor = (a: string | null, b: string) => !!a && a.toLowerCase() === b.toLowerCase();
  const swatchBtn = (key: string, color: string, label: string, onPick: () => void, selected = false) => (
    <button key={key} type="button" aria-label={label} title={label} aria-pressed={selected} onMouseDown={keep} onClick={onPick}
      className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95", selected && "ring-2 ring-primary")}>
      <span aria-hidden className="h-8 w-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: color }} />
    </button>
  );
  const resetSwatch = (label: string, run: () => void, selected: boolean) => (
    <button type="button" aria-label={label} title={label} aria-pressed={selected} onMouseDown={keep} onClick={run}
      className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95", selected && "ring-2 ring-primary")}>
      <span aria-hidden className="relative h-8 w-8 overflow-hidden rounded-full border border-border bg-background">
        <span className="absolute left-1/2 top-[-2px] h-[36px] w-0.5 -translate-x-1/2 rotate-45 bg-destructive" />
      </span>
    </button>
  );
  // Faixa baixa acima da barra: título + ✕ e o conteúdo (Samsung Notes).
  const trayShell = (title: string, body: ReactNode) => (
    <div className="pb-1.5" role="group" aria-label={title}>
      <div className="flex items-center gap-2 px-3 pt-1.5">
        <h2 className="flex-1 truncate text-xs font-semibold text-muted-foreground">{title}</h2>
        <button type="button" aria-label={tt("closeTray", "Fechar")} title={tt("closeTray", "Fechar")} onMouseDown={keep} onClick={() => setSheet(null)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-95">
          <X className="h-4 w-4" />
        </button>
      </div>
      {body}
    </div>
  );
  // Grade de 2 linhas que rola para o lado.
  const colorGrid = (children: ReactNode) => (
    <ScrollRow className="px-2">
      <div className="grid grid-flow-col grid-rows-2 gap-0.5">{children}</div>
    </ScrollRow>
  );

  const styleTray = trayShell(tt("styleTray", "Estilo do parágrafo"), (
    <ScrollRow className="gap-1.5 px-3">
      <button type="button" className={chip(blockValue === "p")} onMouseDown={keep} onClick={() => chain().setParagraph().run()}><Pilcrow className="h-4 w-4" />{tt("normal", "Texto normal")}</button>
      <button type="button" className={chip(blockValue === "h2")} onMouseDown={keep} onClick={() => chain().setNode("heading", { level: 2 }).run()}><Heading2 className="h-4 w-4" />{tt("title", "Título")}</button>
      <button type="button" className={chip(blockValue === "h3")} onMouseDown={keep} onClick={() => chain().setNode("heading", { level: 3 }).run()}><Heading3 className="h-4 w-4" />{tt("subtitle", "Subtítulo")}</button>
      <button type="button" className={chip(blockValue === "quote")} onMouseDown={keep} onClick={() => chain().toggleBlockquote().run()}><Quote className="h-4 w-4" />{tt("blockquote", "Citação")}</button>
    </ScrollRow>
  ));

  const sizeTray = trayShell(tt("sizeTray", "Tamanho da fonte"), (
    <ScrollRow className="gap-1.5 px-3">
      <button type="button" className={cn(chip(false), "w-11 justify-center px-0")} aria-label={tt("sizeDown", "Diminuir letra")} title={tt("sizeDown", "Diminuir letra")} onMouseDown={keep} onClick={() => stepSize(-1)}>A−</button>
      <button type="button" className={chip(sizeNum === null)} onMouseDown={keep} onClick={() => chain().unsetFontSize().run()}>{tt("sizeDefault", "Padrão")}</button>
      {(FONT_SIZE_OPTIONS as readonly number[]).map((n) => (
        <button key={n} type="button" className={cn(chip(sizeNum === n), "min-w-[44px] justify-center tabular-nums")} onMouseDown={keep}
          onClick={() => chain().setFontSize(`${n}px`).run()}>{n}</button>
      ))}
      <button type="button" className={cn(chip(false), "w-11 justify-center px-0")} aria-label={tt("sizeUp", "Aumentar letra")} title={tt("sizeUp", "Aumentar letra")} onMouseDown={keep} onClick={() => stepSize(1)}>A+</button>
    </ScrollRow>
  ));

  const fontColorTray = trayShell(tt("fontColor", "Cor da fonte"), colorGrid(<>
    {resetSwatch(tt("colorAuto", "Automática"), () => chain().unsetColor().run(), !textColorNow)}
    {TEXT_COLORS.map((c) => swatchBtn(`c${c}`, c, `${tt("fontColor", "Cor da fonte")} ${c}`, () => chain().setColor(c).run(), sameColor(textColorNow, c)))}
  </>));

  const bgColorTray = trayShell(tt("bgColor", "Cor do fundo"), colorGrid(<>
    {resetSwatch(tt("noHighlight", "Sem destaque"), () => chain().unsetHighlight().run(), !bgNow)}
    {BG_COLORS.map((c) => swatchBtn(`h${c}`, c, `${tt("bgColor", "Cor do fundo")} ${c}`, () => pickHighlight(c), sameColor(bgNow, c)))}
  </>));

  const fontTray = trayShell(tt("fontTray", "Fonte"), (
    <ScrollRow className="gap-1.5 px-3">
      {FONT_FAMILIES.map((f) => {
        const on = f.value ? isActive("textStyle", { fontFamily: f.value }) : !(editor.getAttributes("textStyle") as { fontFamily?: string }).fontFamily;
        return (
          <button key={f.label} type="button" className={chip(on)} onMouseDown={keep}
            onClick={() => (f.value ? chain().setFontFamily(f.value).run() : chain().unsetFontFamily().run())}>
            <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
          </button>
        );
      })}
    </ScrollRow>
  ));

  const iconChip = (key: string, it: Item) =>
    it.available === false ? null : (
      <button key={key} type="button" className={cn(chip(!!it.active), "w-12 justify-center px-0")} aria-label={it.label} title={it.label}
        aria-pressed={it.active === undefined ? undefined : !!it.active} disabled={it.disabled} onMouseDown={keep} onClick={it.run}>
        {it.icon}
      </button>
    );
  const alignTray = trayShell(tt("alignTray", "Alinhamento"), (
    <ScrollRow className="gap-1.5 px-3">
      {iconChip("al", items.alignLeft)}{iconChip("ac", items.alignCenter)}{iconChip("ar", items.alignRight)}{iconChip("aj", items.alignJustify)}
    </ScrollRow>
  ));
  const listsTray = trayShell(tt("listsTray", "Listas e recuo"), (
    <ScrollRow className="gap-1.5 px-3">
      {iconChip("ul", items.bulletList)}{iconChip("ol", items.orderedList)}{iconChip("tl", items.taskList)}
      {iconChip("out", items.outdent)}{iconChip("in", items.indent)}{iconChip("fl", items.firstLine)}
    </ScrollRow>
  ));

  // ===== "⋯": painel baixo acima da barra (nunca cobre o texto inteiro) =====
  const inTable = isActive("table");
  const trayMax = trayMaxHeight(visibleHeight);
  const page = (key: string, title: string, tiles: ReactNode[]) => {
    const list = tiles.filter(Boolean);
    return list.length ? { key, title, tiles: list } : null;
  };
  const pages = [
    page("text", tt("sectionText", "Texto"), [
      tile("b", items.bold), tile("i", items.italic), tile("u", items.underline), tile("hl", items.highlight),
      tile("sub", items.subscript), tile("sup", items.superscript), tile("code", items.code), tile("clr", items.clearFormat),
    ]),
    page("format", tt("sectionFormat", "Estilo e cor"), [
      tile("st", items.style), tile("sz", items.size), tile("fc", items.fontColor), tile("bg", items.bgColor), tile("ff", items.font),
      tile("h2", items.heading2), tile("h3", items.heading3), tile("q", items.blockquote), tile("cb", items.codeBlock),
    ]),
    page("paragraph", tt("sectionParagraph", "Parágrafo"), [
      tile("al", items.alignLeft), tile("ac", items.alignCenter), tile("ar", items.alignRight), tile("aj", items.alignJustify), tile("fl", items.firstLine),
      tile("ul", items.bulletList), tile("ol", items.orderedList), tile("tl", items.taskList), tile("out", items.outdent), tile("in", items.indent),
    ]),
    page("insert", tt("sectionInsert", "Inserir"), [
      tile("photo", items.photo, true), tile("video", items.video, true), tile("al2", items.attachLink, true), tile("link", items.link, true),
      isActive("link") ? tile("unlink", { icon: <Link2Off className={ic} />, label: tt("unlink", "Remover link"), run: () => chain().unsetLink().run() }) : null,
      tile("table", items.table), tile("hr", items.hr), tile("topic", items.topic, true), tile("conv", items.convertHeadings),
    ]),
    inTable ? page("table", tt("table", "Tabela"), [
      tile("tar", { icon: <Plus className={ic} />, label: tt("addRow", "Adicionar linha"), run: () => chain().addRowAfter().run() }),
      tile("tac", { icon: <Plus className={cn(ic, "rotate-90")} />, label: tt("addCol", "Adicionar coluna"), run: () => chain().addColumnAfter().run() }),
      tile("tdr", { icon: <Minus className={ic} />, label: tt("delRow", "Remover linha"), run: () => chain().deleteRow().run() }),
      tile("tdc", { icon: <Minus className={cn(ic, "rotate-90")} />, label: tt("delCol", "Remover coluna"), run: () => chain().deleteColumn().run() }),
      tile("tdt", { icon: <Trash2 className={cn(ic, "text-destructive")} />, label: tt("delTable", "Excluir tabela"), run: () => chain().deleteTable().run() }, true),
    ]) : null,
    page("tools", tt("sectionTools", "Ferramentas"), [
      tile("search", items.search, true), tile("focus", items.focus, true),
      tile("custom", { icon: <SlidersHorizontal className={ic} />, label: tt("customize", "Personalizar barra"), run: () => setSheet("customize") }),
      onToggleCollapsed ? tile("hide", { icon: <ChevronDown className={ic} />, label: tt("hideBar", "Ocultar barra"), run: () => onToggleCollapsed() }, true) : null,
    ]),
  ].filter((p): p is { key: string; title: string; tiles: ReactNode[] } => !!p);
  const moreTray = (
    <PagedTray
      title={tt("more", "Mais ferramentas")}
      pages={pages}
      closeLabel={tt("closeTray", "Fechar")}
      onClose={() => setSheet(null)}
      maxHeight={trayMax}
    />
  );

  const toolRow = (
    <div className="flex items-center gap-0.5 px-1 py-1">
      <button type="button" className={barBtn()} title={tt("undo", "Desfazer")} aria-label={tt("undo", "Desfazer")}
        disabled={!editor.can().undo()} onMouseDown={keep} onClick={() => chain().undo().run()}>
        <Undo2 className={ic} />
      </button>
      <div className="my-2 w-px shrink-0 self-stretch bg-border" aria-hidden />
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
      <div className="my-2 w-px shrink-0 self-stretch bg-border" aria-hidden />
      <button type="button" className={barBtn(sheet === "more" || sheet === "customize")} title={tt("more", "Mais ferramentas")}
        aria-label={tt("more", "Mais ferramentas")} aria-expanded={sheet === "more"} onMouseDown={keep}
        onClick={() => setSheet((s) => (s === "more" ? null : "more"))}>
        <Ellipsis className={ic} />
      </button>
    </div>
  );

  const docked = dock === "keyboard";
  const shell = cn(
    "border-t bg-background",
    docked ? "shadow-lg" : "rounded-b-md",
  );
  const content = collapsed ? (
    <div className={cn(shell, "flex justify-center px-2 py-1.5")} onMouseDown={keep}>
      <button type="button" aria-expanded={false} onMouseDown={keep} onClick={() => onToggleCollapsed?.()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-muted px-4 text-xs font-medium text-foreground active:scale-95">
        <span className="font-semibold">Aa</span>
        {t("notes.toolbar.show", { defaultValue: "Ferramentas" })}
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  ) : (
    <div className={shell} onMouseDown={keep}>
      {sheet && sheet !== "customize" && (
        <div className="border-b">
          {sheet === "style" ? styleTray
            : sheet === "size" ? sizeTray
            : sheet === "fontColor" ? fontColorTray
            : sheet === "bgColor" ? bgColorTray
            : sheet === "font" ? fontTray
            : sheet === "align" ? alignTray
            : sheet === "lists" ? listsTray
            : moreTray}
        </div>
      )}
      {toolRow}
    </div>
  );

  const customize = sheet === "customize" && (
    <CustomizeSheet
      initial={barIds}
      items={items}
      onCancel={() => setSheet("more")}
      onSave={(ids) => { saveToolbar(scope, ids); setSheet(null); }}
    />
  );

  if (docked) {
    return (
      <>
        {mounted && createPortal(
          // Colada em cima do teclado (Samsung Notes / Notas do iPhone).
          <div className="fixed inset-x-0 z-[55]" style={{ bottom: keyboardInset }} data-editor-toolbar="keyboard">
            <div className="mx-auto w-full max-w-3xl">{content}</div>
          </div>,
          document.body,
        )}
        {customize}
      </>
    );
  }

  return (
    <>
      <div
        data-editor-toolbar="bottom"
        className={cn("transition-opacity", (dock === "hidden" || !visible) && "pointer-events-none opacity-0")}
      >
        {content}
      </div>
      {customize}
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
        <p className="px-1 text-xs text-muted-foreground">{tt("alwaysOnBarV2", "Desfazer e ⋯ ficam sempre na barra.")}</p>
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
function ScrollRow({ children, className }: { children: ReactNode; className?: string }) {
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
        className={cn("flex items-center gap-0.5 overflow-x-auto whitespace-nowrap no-scrollbar min-w-0", className)}
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


/**
 * "Mais ferramentas" em páginas de no máximo 2 linhas: arrasta para o lado
 * e aparece o próximo grupo (como as páginas de ícones do celular).
 */
function PagedTray({ title, pages, closeLabel, onClose, maxHeight }: {
  title: string;
  pages: { key: string; title: string; tiles: ReactNode[] }[];
  closeLabel: string;
  onClose: () => void;
  maxHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const drag = useRef<{ x: number; sl: number; moved: boolean } | null>(null);
  const safeIdx = Math.min(idx, Math.max(0, pages.length - 1));
  const goTo = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="flex flex-col pb-1" data-max={maxHeight}>
      <div className="flex shrink-0 items-center gap-2 px-3 pt-1.5">
        <h2 className="flex-1 truncate text-xs font-semibold text-muted-foreground">
          {title} · <span className="text-foreground">{pages[safeIdx]?.title}</span>
        </h2>
        <button type="button" aria-label={closeLabel} title={closeLabel} onMouseDown={keep} onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-95">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        className="flex shrink-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          drag.current = { x: e.clientX, sl: ref.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 8) d.moved = true;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d?.moved) return;
          const dx = e.clientX - d.x;
          goTo(Math.max(0, Math.min(pages.length - 1, safeIdx + (dx < 0 ? 1 : -1))));
        }}
        onPointerLeave={() => { drag.current = null; }}
      >
        {pages.map((p) => (
          <section key={p.key} aria-label={p.title} className="w-full shrink-0 snap-start px-2 pt-1">
            <div className="grid grid-cols-5 grid-rows-[56px_56px] gap-1.5">{p.tiles.slice(0, 10)}</div>
          </section>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex shrink-0 justify-center gap-0.5 pt-1">
          {pages.map((p, i) => (
            <button key={p.key} type="button" aria-label={p.title} aria-current={i === safeIdx} onMouseDown={keep} onClick={() => goTo(i)}
              className="inline-flex h-4 w-5 items-center justify-center">
              <span aria-hidden className={cn("h-1.5 rounded-full transition-all", i === safeIdx ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
