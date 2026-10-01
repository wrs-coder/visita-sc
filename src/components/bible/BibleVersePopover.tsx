import { useEffect, useMemo, useRef, useState, useCallback, useId } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Loader2, BookOpen, GripHorizontal, X, Bold, Highlighter, Eraser,
  Copy, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, List, FilePlus2,
  AArrowDown, AArrowUp, SlidersHorizontal,
} from "lucide-react";
import { getChapterFromLibrary } from "@/lib/bible-notes-store";
import { pushVerseHistory } from "@/lib/bible-history";
import { getLocalizedBookName } from "@/lib/bible-canon";
import type { CitationMatch } from "@/lib/bible-refs";
import { cn } from "@/lib/utils";
import {
  loadSettings,
  saveSettings,
  type BibleViewSettings,
  type BibleColor,
  type HighlightColor,
  HIGHLIGHT_COLORS,
  TEXT_SCALE_MIN,
  TEXT_SCALE_MAX,
  TEXT_SCALE_STEP,
  clampTextScale,
  clampHeight,
  neighborVerse,
  highlightKey,
  getHighlights,
  addHighlight,
  removeHighlightAt,
  clearHighlights,
  buildSegments,
  type BibleHighlight,
} from "@/lib/bible-view-settings";

const HL_LABELS: Record<HighlightColor, string> = {
  yellow: "Amarelo", green: "Verde", blue: "Azul", pink: "Rosa", orange: "Laranja",
};
import { toast } from "sonner";

interface VerseLinkProps {
  match: CitationMatch;
  libraryId: string | null;
  className?: string;
  fontScale?: number;
  onInsert?: (text: string) => void | Promise<void>;
  /** Abre o balão já montado (uso programático, sem clique no gatilho). */
  autoOpen?: boolean;
  /** Esconde visualmente o gatilho — o balão fica ancorado no mesmo ponto. */
  hideTrigger?: boolean;
  /** Chamado quando o balão é fechado deliberadamente pelo usuário. */
  onClosed?: () => void;
}

const MAX_RANGE = 10;
const COLORS: BibleColor[] = ["white", "black", "sepia", "yellow", "night_blue"];
const SWATCH_BG: Record<BibleColor, string> = {
  white: "#ffffff",
  black: "#111111",
  sepia: "#f4ecd8",
  yellow: "#fff7c2",
  night_blue: "#0b1d3a",
};

interface VersePart {
  verse: number;
  text: string;
}

export function VerseLink({
  match, libraryId, className, fontScale = 1, onInsert,
  autoOpen = false, hideTrigger = false, onClosed,
}: VerseLinkProps) {
  const { t, i18n } = useTranslation();
  const displayBook = getLocalizedBookName(match.bookId, i18n.language) ?? match.bookName;
  const [open, setOpen] = useState(autoOpen);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const controlsId = useId();
  const [loading, setLoading] = useState(false);
  // Capítulo atualmente carregado (permite navegar entre capítulos).
  const [chapter, setChapter] = useState(match.chapter);
  const [chapterVerses, setChapterVerses] = useState<VersePart[] | null>(null);
  // Modo "capítulo completo" e "ver mais" (acima do limite de MAX_RANGE).
  const [chapterMode, setChapterMode] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [inserting, setInserting] = useState(false);
  // Versículo isolado escolhido pelas setas anterior/próximo.
  const [verseOverride, setVerseOverride] = useState<number | null>(null);

  // View settings (color + bold) — global, persisted in localStorage.
  const [settings, setSettings] = useState<BibleViewSettings>(() => loadSettings());

  // Highlights per verse — keyed by libraryId|bookId|chapter|verse.
  // Stored as a map verse -> highlights[] for the verses currently shown.
  const [highlightsByVerse, setHighlightsByVerse] = useState<Record<number, BibleHighlight[]>>({});

  // Offset de arrasto aplicado via margin (não conflita com o transform do
  // Floating UI/Radix). Resetado sempre que o popup fecha.
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    pointerId: number;
  } | null>(null);

  // Política de fechamento (Missão 03): o popup NUNCA fecha sozinho.
  // Só fecha quando o usuário aciona deliberadamente o botão "X" ou
  // dá dois toques no conteúdo. `allowCloseRef` libera o próximo
  // `false` recebido em `onOpenChange`; qualquer outro pedido de
  // fechar é ignorado (Escape, click fora, blur, focus outside,
  // toggle do trigger etc.), inclusive em Tela Cheia.
  const allowCloseRef = useRef(false);

  const explicitClose = useCallback(() => {
    allowCloseRef.current = true;
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setSettings(loadSettings());
      setControlsExpanded(false);
      setOpen(true);
      return;
    }
    if (allowCloseRef.current) {
      allowCloseRef.current = false;
      setOpen(false);
    }
    // senão: ignora — mantém o popup aberto.
  }, []);

  const handleDoubleTapClose = useCallback(() => {
    explicitClose();
  }, [explicitClose]);

  const handleTextTouchEnd = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      explicitClose();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [explicitClose]);

  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 });
      setControlsExpanded(false);
      // Volta ao estado original da citação ao reabrir.
      setChapterMode(false);
      setShowAll(false);
      setVerseOverride(null);
      setChapter(match.chapter);
    }
  }, [open, match.chapter]);

  // Uso programático: avisa o componente pai quando o usuário fecha o balão.
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) onClosed?.();
    wasOpenRef.current = open;
  }, [open, onClosed]);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Não capturar o pointer quando o toque foi em um botão interno
    // (ex.: fechar "X"), caso contrário o click do botão é perdido.
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      pointerId: e.pointerId,
    };
  }
  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const next = { x: d.baseX + dx, y: d.baseY + dy };
    const el = contentRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const minX = 8 - (rect.left - offset.x);
      const maxX = window.innerWidth - 8 - (rect.right - offset.x);
      const minY = 8 - (rect.top - offset.y);
      const maxY = window.innerHeight - 8 - (rect.bottom - offset.y);
      next.x = Math.min(Math.max(next.x, minX), maxX);
      next.y = Math.min(Math.max(next.y, minY), maxY);
    }
    setOffset(next);
  }
  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* noop */ }
    dragRef.current = null;
  }

  // Carrega o capítulo inteiro numa única transação (getAll + IDBKeyRange),
  // em vez de uma leitura por versículo. Serve tanto para a citação quanto
  // para o modo "capítulo completo" e a navegação entre capítulos.
  useEffect(() => {
    if (!open) return;
    if (!libraryId) {
      setChapterVerses([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getChapterFromLibrary(libraryId, match.bookId, chapter)
      .then((recs) => {
        if (cancelled) return;
        setChapterVerses(recs.map((r) => ({ verse: r.verse, text: r.text })).filter((r) => r.text));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setChapterVerses([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, libraryId, match.bookId, chapter]);

  // Versículos exibidos: capítulo inteiro ou apenas os da citação.
  const selectedVerses = useMemo<number[]>(() => {
    if (match.verses && match.verses.length > 0) return [...match.verses];
    const start = match.verse;
    const end = match.verseEnd && match.verseEnd > start ? match.verseEnd : start;
    const nums: number[] = [];
    for (let v = start; v <= end; v++) nums.push(v);
    return nums;
  }, [match.verse, match.verseEnd, match.verses]);

  const totalSelected = selectedVerses.length;
  const truncated = !chapterMode && !showAll && totalSelected > MAX_RANGE;

  const parts = useMemo<VersePart[] | null>(() => {
    if (chapterVerses === null) return null;
    if (chapterMode) return chapterVerses;
    if (verseOverride != null) return chapterVerses.filter((v) => v.verse === verseOverride);
    const byVerse = new Map(chapterVerses.map((v) => [v.verse, v.text]));
    const nums = truncated ? selectedVerses.slice(0, MAX_RANGE) : selectedVerses;
    return nums
      .map((v) => ({ verse: v, text: byVerse.get(v) ?? "" }))
      .filter((p) => p.text);
  }, [chapterVerses, chapterMode, selectedVerses, truncated]);

  // Load highlights for the verses currently shown.
  useEffect(() => {
    if (!open || !parts || !libraryId) return;
    const map: Record<number, BibleHighlight[]> = {};
    for (const p of parts) {
      map[p.verse] = getHighlights(highlightKey(libraryId, match.bookId, chapter, p.verse));
    }
    setHighlightsByVerse(map);
  }, [open, parts, libraryId, match.bookId, chapter]);

  // Histórico local dos últimos versículos consultados.
  useEffect(() => {
    if (!open) return;
    pushVerseHistory({
      bookId: match.bookId,
      bookName: displayBook,
      chapter: match.chapter,
      verse: match.verse,
    });
  }, [open, match.bookId, match.chapter, match.verse, displayBook]);

  const buildVerseText = useCallback(() => {
    if (!parts || parts.length === 0) return;
    const ref = chapterMode
      ? `${displayBook} ${chapter}`
      : `${displayBook} ${chapter}:${parts.map((p) => p.verse).join(", ")}`;
    const body = parts.map((p) => `${p.verse} ${p.text}`).join(" ");
    return `${ref} — ${body}`;
  }, [parts, displayBook, chapter, chapterMode]);

  const onCopy = useCallback(async () => {
    const text = buildVerseText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("bibleVerse.copied", { defaultValue: "Texto copiado" }));
    } catch {
      toast.error(t("bibleVerse.copyFailed", { defaultValue: "Não foi possível copiar" }));
    }
  }, [buildVerseText, t]);

  const onInsertClick = useCallback(async () => {
    const text = buildVerseText();
    if (!text || !onInsert || inserting) return;
    setInserting(true);
    try {
      await onInsert(text);
      toast.success(t("bibleVerse.inserted", { defaultValue: "Texto inserido no esboço" }));
    } catch {
      toast.error(t("bibleVerse.insertFailed", { defaultValue: "Não foi possível inserir o texto" }));
    } finally {
      setInserting(false);
    }
  }, [buildVerseText, inserting, onInsert, t]);

  const goChapter = useCallback((delta: number) => {
    setChapter((c) => Math.max(1, c + delta));
    setChapterMode(true);
    setVerseOverride(null);
  }, []);

  // Navegação versículo a versículo, sem sair do capítulo carregado.
  const availableVerses = useMemo(() => (chapterVerses ?? []).map((v) => v.verse), [chapterVerses]);
  const navAnchor = useMemo(() => {
    if (verseOverride != null) return { lo: verseOverride, hi: verseOverride };
    if (chapterMode || chapter !== match.chapter) return { lo: Infinity, hi: -Infinity };
    return { lo: Math.min(...selectedVerses), hi: Math.max(...selectedVerses) };
  }, [verseOverride, chapterMode, chapter, match.chapter, selectedVerses]);
  const prevVerse = Number.isFinite(navAnchor.lo)
    ? neighborVerse(availableVerses, navAnchor.lo, -1)
    : (availableVerses.length ? Math.min(...availableVerses) : null);
  const nextVerse = Number.isFinite(navAnchor.hi)
    ? neighborVerse(availableVerses, navAnchor.hi, 1)
    : (availableVerses.length ? Math.min(...availableVerses) : null);
  const goVerse = (delta: -1 | 1) => {
    const target = delta < 0 ? prevVerse : nextVerse;
    if (target == null) return;
    setChapterMode(false);
    setVerseOverride(target);
  };

  const updateSetting = (patch: Partial<BibleViewSettings>) => {
    setSettings(saveSettings(patch));
  };
  const changeTextScale = (dir: -1 | 1) => {
    updateSetting({ textScale: clampTextScale(settings.textScale + dir * TEXT_SCALE_STEP) });
  };
  const onPickHighlightColor = (c: HighlightColor) => {
    updateSetting({ highlightColor: c });
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && textRef.current?.contains(sel.anchorNode)) {
      // Aplica direto quando já há texto selecionado.
      onHighlightClickRef.current?.(c);
    }
  };
  const onHighlightClickRef = useRef<((color?: HighlightColor) => void) | null>(null);

  // Compute the (verse, offset) from a DOM Range endpoint within the text container.
  // Each verse span has data-verse and a single text node as descendants (split by segments).
  const computeOffsetInVerse = useCallback((node: Node, offsetInNode: number): { verse: number; offset: number } | null => {
    // Walk up to find the segment element with data-verse + data-seg-start.
    let el: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? (node.parentElement as HTMLElement | null) : (node as HTMLElement);
    while (el && !(el.dataset.verse && el.dataset.segStart !== undefined)) {
      el = el.parentElement;
    }
    if (!el) return null;
    const verse = Number(el.dataset.verse);
    const segStart = Number(el.dataset.segStart);
    if (!Number.isFinite(verse) || !Number.isFinite(segStart)) return null;
    return { verse, offset: segStart + offsetInNode };
  }, []);

  const onHighlightClick = (color?: HighlightColor) => {
    if (!libraryId || !parts) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      toast.info(t("bibleVerse.selectToHighlight"));
      return;
    }
    const range = sel.getRangeAt(0);
    const container = textRef.current;
    if (!container || !container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      toast.info(t("bibleVerse.selectToHighlight"));
      return;
    }
    const a = computeOffsetInVerse(range.startContainer, range.startOffset);
    const b = computeOffsetInVerse(range.endContainer, range.endOffset);
    if (!a || !b || a.verse !== b.verse) {
      toast.info(t("bibleVerse.selectToHighlight"));
      return;
    }
    const start = Math.min(a.offset, b.offset);
    const end = Math.max(a.offset, b.offset);
    if (end <= start) return;
    const key = highlightKey(libraryId, match.bookId, chapter, a.verse);
    const next = addHighlight(key, { start, end, color: color ?? settings.highlightColor });
    setHighlightsByVerse((m) => ({ ...m, [a.verse]: next }));
    sel.removeAllRanges();
  };
  onHighlightClickRef.current = onHighlightClick;

  const onSegmentClick = (verse: number, segStart: number, highlighted: boolean) => {
    if (!libraryId || !highlighted) return;
    const key = highlightKey(libraryId, match.bookId, chapter, verse);
    const next = removeHighlightAt(key, segStart);
    setHighlightsByVerse((m) => ({ ...m, [verse]: next }));
  };

  const onClearAll = () => {
    if (!libraryId || !parts) return;
    for (const p of parts) {
      clearHighlights(highlightKey(libraryId, match.bookId, chapter, p.verse));
    }
    setHighlightsByVerse(Object.fromEntries(parts.map((p) => [p.verse, []])));
  };

  const isList = Boolean(match.verses && match.verses.length > 1);
  const isRange = !isList && match.verseEnd && match.verseEnd > match.verse;
  const headerVerses = chapterMode
    ? ""
    : verseOverride != null
      ? `${verseOverride}`
      : isList
        ? match.verses!.join(",")
        : match.verseEnd
          ? `${match.verse}-${match.verseEnd}`
          : `${match.verse}`;
  const multiVerse = chapterMode || (verseOverride == null && (isRange || isList));

  const textContainerClass = useMemo(
    () => cn("text-sm leading-relaxed space-y-1.5 px-4 py-3 rounded-b-md", `bible-color-${settings.color}`, settings.bold && "bible-text-bold"),
    [settings],
  );

  const renderVerseSegments = (p: VersePart) => {
    const segs = buildSegments(p.text, highlightsByVerse[p.verse] ?? []);
    return segs.map((s, i) => (
      <span
        key={`${p.verse}-${i}`}
        data-verse={p.verse}
        data-seg-start={s.start}
        className={s.highlighted ? `bible-highlight bible-hl-${s.color ?? "yellow"}` : undefined}
        onClick={s.highlighted ? () => onSegmentClick(p.verse, s.start, true) : undefined}
      >
        {s.text}
      </span>
    ));
  };

  // Altura ajustável pelo usuário (limitada à tela).
  const [viewportH, setViewportH] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    if (!open) return;
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);
  const effectiveHeight = clampHeight(settings.height, viewportH);
  const resizeRef = useRef<{ startY: number; base: number; pointerId: number } | null>(null);
  const scrollBoxHeight = () =>
    (textRef.current?.parentElement?.getBoundingClientRect().height ?? 200);
  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startY: e.clientY, base: effectiveHeight ?? scrollBoxHeight(), pointerId: e.pointerId };
  }
  function onResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    const h = clampHeight(r.base + (e.clientY - r.startY), window.innerHeight);
    setSettings((s) => ({ ...s, height: h }));
  }
  function onResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    resizeRef.current = null;
    setSettings((s) => saveSettings({ height: s.height }));
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {hideTrigger ? (
          <span aria-hidden className="inline-block h-0 w-0 overflow-hidden align-baseline" />
        ) : (
          <button
            type="button"
            className={cn(
              "text-sky-600 dark:text-sky-400 underline-offset-2 hover:underline font-medium",
              className,
            )}
            style={fontScale !== 1 ? { fontSize: `${fontScale}em` } : undefined}
          >
            {match.raw}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="w-80 max-w-[90vw] max-h-[85dvh] overflow-hidden z-[110] p-0 flex flex-col"
        align="start"
        style={{ marginLeft: offset.x, marginTop: offset.y }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        // Esc é uma ação deliberada do usuário (teclado): fecha o popup.
        // Cliques fora, blur e toggle continuam ignorados (Missão 03).
        onEscapeKeyDown={() => explicitClose()}
      >
        {/* Alça de arrasto + fechar */}
        <div
          role="toolbar"
          aria-label={t("bibleVerse.dragHandle", { defaultValue: "Arrastar" })}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/60 cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground flex-1 truncate">
            {displayBook} {chapter}{headerVerses ? `:${headerVerses}` : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={controlsExpanded}
            aria-controls={controlsId}
            aria-label={t(controlsExpanded ? "bibleVerse.hideControls" : "bibleVerse.showControls")}
            title={t(controlsExpanded ? "bibleVerse.hideControls" : "bibleVerse.showControls")}
            onClick={(e) => { e.stopPropagation(); setControlsExpanded((v) => !v); }}
            className="h-7 w-7 shrink-0 text-muted-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void onCopy(); }}
            className="p-1 rounded hover:bg-background text-muted-foreground"
            aria-label={t("bibleVerse.copy", { defaultValue: "Copiar texto" })}
            title={t("bibleVerse.copy", { defaultValue: "Copiar texto" })}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {onInsert && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onInsertClick(); }}
              disabled={inserting || !parts || parts.length === 0}
              className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
              aria-label={t("bibleVerse.insert", { defaultValue: "Inserir no esboço" })}
              title={t("bibleVerse.insert", { defaultValue: "Inserir no esboço" })}
            >
              {inserting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              explicitClose();
            }}
            className="p-1 rounded hover:bg-background text-muted-foreground"
            aria-label={t("bibleVerse.close", { defaultValue: "Fechar" })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>


        <div id={controlsId} hidden={!controlsExpanded} className="shrink-0 max-h-[40dvh] overflow-y-auto">
        {/* Barra de aparência (cor, negrito, grifar) */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/30" aria-label={t("bibleVerse.viewSettings")}>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t("bibleVerse.color")}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={settings.color === c}
                title={t(`bibleVerse.colors.${c}`)}
                onClick={() => updateSetting({ color: c })}
                className={cn(
                  "h-5 w-5 rounded-full border transition",
                  settings.color === c ? "ring-2 ring-primary ring-offset-1" : "border-border",
                )}
                style={{ backgroundColor: SWATCH_BG[c] }}
              />
            ))}
          </div>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            aria-pressed={settings.bold}
            title={t("bibleVerse.bold")}
            onClick={() => updateSetting({ bold: !settings.bold })}
            className={cn(
              "p-1 rounded hover:bg-background",
              settings.bold ? "bg-background text-foreground" : "text-muted-foreground",
            )}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.fontSmaller", { defaultValue: "Diminuir letra" })}
            aria-label={t("bibleVerse.fontSmaller", { defaultValue: "Diminuir letra" })}
            onClick={() => changeTextScale(-1)}
            disabled={settings.textScale <= TEXT_SCALE_MIN}
            className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
          >
            <AArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.fontLarger", { defaultValue: "Aumentar letra" })}
            aria-label={t("bibleVerse.fontLarger", { defaultValue: "Aumentar letra" })}
            onClick={() => changeTextScale(1)}
            disabled={settings.textScale >= TEXT_SCALE_MAX}
            className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
          >
            <AArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Destaque e navegação */}
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b bg-muted/30">
          <button
            type="button"
            title={t("bibleVerse.highlight")}
            aria-label={t("bibleVerse.highlight")}
            onClick={() => onHighlightClick()}
            className="p-1 rounded hover:bg-background text-muted-foreground"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t("bibleVerse.highlightColor", { defaultValue: "Cor do destaque" })}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={settings.highlightColor === c}
                aria-label={t(`bibleVerse.highlightColors.${c}`, { defaultValue: HL_LABELS[c] })}
                title={t(`bibleVerse.highlightColors.${c}`, { defaultValue: HL_LABELS[c] })}
                onClick={() => onPickHighlightColor(c)}
                className={cn(
                  "h-4 w-4 rounded-sm border bible-hl-swatch",
                  `bible-hl-${c}`,
                  settings.highlightColor === c ? "ring-2 ring-primary ring-offset-1" : "border-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            title={t("bibleVerse.clearHighlights")}
            aria-label={t("bibleVerse.clearHighlights")}
            onClick={onClearAll}
            className="p-1 rounded hover:bg-background text-muted-foreground"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            aria-pressed={chapterMode}
            title={
              chapterMode
                ? t("bibleVerse.backToVerse", { defaultValue: "Voltar ao versículo" })
                : t("bibleVerse.readChapter", { defaultValue: "Ler o capítulo inteiro" })
            }
            onClick={() => { setVerseOverride(null); setChapterMode((v) => !v); }}
            className={cn(
              "p-1 rounded hover:bg-background",
              chapterMode ? "bg-background text-foreground" : "text-muted-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.prevVerse", { defaultValue: "Versículo anterior" })}
            aria-label={t("bibleVerse.prevVerse", { defaultValue: "Versículo anterior" })}
            onClick={() => goVerse(-1)}
            disabled={prevVerse == null}
            className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.nextVerse", { defaultValue: "Próximo versículo" })}
            aria-label={t("bibleVerse.nextVerse", { defaultValue: "Próximo versículo" })}
            onClick={() => goVerse(1)}
            disabled={nextVerse == null}
            className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.prevChapter", { defaultValue: "Capítulo anterior" })}
            onClick={() => goChapter(-1)}
            disabled={chapter <= 1}
            className="p-1 rounded hover:bg-background text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.nextChapter", { defaultValue: "Próximo capítulo" })}
            onClick={() => goChapter(1)}
            className="p-1 rounded hover:bg-background text-muted-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        </div>


        <div
          className={cn("overflow-y-auto overscroll-contain min-h-0", effectiveHeight == null && "max-h-[70dvh]")}
          style={effectiveHeight != null ? { height: effectiveHeight, flexShrink: 1 } : undefined}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("bibleVerse.loading")}
            </div>
          ) : parts && parts.length > 0 ? (
            <div
              ref={textRef}
              className={textContainerClass}
              style={{ fontSize: `${settings.textScale * 0.875}rem` }}
              onDoubleClick={handleDoubleTapClose}
              onTouchEnd={handleTextTouchEnd}
            >
              {multiVerse ? (
                <p>
                  {parts.map((p, i) => (
                    <span key={p.verse}>
                      {i > 0 ? " " : ""}
                      <sup className="text-[0.7em] font-semibold opacity-70 mr-0.5">
                        {p.verse}
                      </sup>
                      {renderVerseSegments(p)}
                    </span>
                  ))}
                </p>
              ) : (
                <p>{renderVerseSegments(parts[0])}</p>
              )}
              {truncated && (
                <p className="text-[11px] opacity-80 italic pt-1">
                  {t("bibleVerse.truncated", {
                    defaultValue:
                      "Mostrando {{shown}} de {{total}} versículos.",
                    shown: MAX_RANGE,
                    total: totalSelected,
                  })}{" "}
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="underline font-medium not-italic"
                  >
                    {t("bibleVerse.showAll", { defaultValue: "Ver todos" })}
                  </button>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic px-4 py-3">
              {t("bibleVerse.notFound")}
            </p>
          )}
        </div>
        {/* Alça para ajustar a altura */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t("bibleVerse.resize", { defaultValue: "Ajustar altura" })}
          title={t("bibleVerse.resize", { defaultValue: "Ajustar altura" })}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onDoubleClick={() => updateSetting({ height: null })}
          className="flex h-4 items-center justify-center border-t bg-muted/40 cursor-ns-resize touch-none select-none"
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
