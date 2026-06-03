import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, BookOpen, GripHorizontal, X, Bold, Highlighter, Eraser } from "lucide-react";
import { getVerseFromLibrary } from "@/lib/bible-notes-store";
import type { CitationMatch } from "@/lib/bible-refs";
import { cn } from "@/lib/utils";
import {
  loadSettings,
  saveSettings,
  type BibleViewSettings,
  type BibleColor,
  highlightKey,
  getHighlights,
  addHighlight,
  removeHighlightAt,
  clearHighlights,
  buildSegments,
  type BibleHighlight,
} from "@/lib/bible-view-settings";
import { toast } from "sonner";

interface VerseLinkProps {
  match: CitationMatch;
  libraryId: string | null;
  className?: string;
  fontScale?: number;
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

export function VerseLink({ match, libraryId, className, fontScale = 1 }: VerseLinkProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<VersePart[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleDoubleTapClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleTextTouchEnd = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setOpen(false);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  useEffect(() => {
    if (!open) setOffset({ x: 0, y: 0 });
  }, [open]);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
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

  useEffect(() => {
    if (!open || parts !== null) return;
    if (!libraryId) {
      setParts([]);
      return;
    }
    setLoading(true);

    let nums: number[];
    let cappedTruncation = false;
    if (match.verses && match.verses.length > 0) {
      nums = [...match.verses];
      if (nums.length > MAX_RANGE) {
        nums = nums.slice(0, MAX_RANGE);
        cappedTruncation = true;
      }
    } else {
      const start = match.verse;
      let end = match.verseEnd && match.verseEnd > start ? match.verseEnd : start;
      if (end - start + 1 > MAX_RANGE) {
        end = start + MAX_RANGE - 1;
        cappedTruncation = true;
      }
      nums = [];
      for (let v = start; v <= end; v++) nums.push(v);
    }

    Promise.all(
      nums.map((v) =>
        getVerseFromLibrary(libraryId, match.bookId, match.chapter, v).then((rec) => ({
          verse: v,
          text: rec?.text ?? "",
        })),
      ),
    ).then((results) => {
      setParts(results.filter((r) => r.text));
      setTruncated(cappedTruncation);
      setLoading(false);
    });
  }, [open, libraryId, match.bookId, match.chapter, match.verse, match.verseEnd, match.verses, parts]);

  // Load highlights for the verses currently shown.
  useEffect(() => {
    if (!open || !parts || !libraryId) return;
    const map: Record<number, BibleHighlight[]> = {};
    for (const p of parts) {
      map[p.verse] = getHighlights(highlightKey(libraryId, match.bookId, match.chapter, p.verse));
    }
    setHighlightsByVerse(map);
  }, [open, parts, libraryId, match.bookId, match.chapter]);

  const updateSetting = (patch: Partial<BibleViewSettings>) => {
    setSettings(saveSettings(patch));
  };

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

  const onHighlightClick = () => {
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
    const key = highlightKey(libraryId, match.bookId, match.chapter, a.verse);
    const next = addHighlight(key, { start, end });
    setHighlightsByVerse((m) => ({ ...m, [a.verse]: next }));
    sel.removeAllRanges();
  };

  const onSegmentClick = (verse: number, segStart: number, highlighted: boolean) => {
    if (!libraryId || !highlighted) return;
    const key = highlightKey(libraryId, match.bookId, match.chapter, verse);
    const next = removeHighlightAt(key, segStart);
    setHighlightsByVerse((m) => ({ ...m, [verse]: next }));
  };

  const onClearAll = () => {
    if (!libraryId || !parts) return;
    for (const p of parts) {
      clearHighlights(highlightKey(libraryId, match.bookId, match.chapter, p.verse));
    }
    setHighlightsByVerse(Object.fromEntries(parts.map((p) => [p.verse, []])));
  };

  const isList = Boolean(match.verses && match.verses.length > 1);
  const isRange = !isList && match.verseEnd && match.verseEnd > match.verse;
  const headerVerses = isList
    ? match.verses!.join(",")
    : match.verseEnd
      ? `${match.verse}-${match.verseEnd}`
      : `${match.verse}`;

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
        className={s.highlighted ? "bible-highlight" : undefined}
        onClick={s.highlighted ? () => onSegmentClick(p.verse, s.start, true) : undefined}
      >
        {s.text}
      </span>
    ));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="w-80 max-w-[90vw] max-h-[70vh] overflow-hidden z-[110] p-0"
        align="start"
        style={{ marginLeft: offset.x, marginTop: offset.y }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
            {match.bookName} {match.chapter}:{headerVerses}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="p-1 rounded hover:bg-background text-muted-foreground"
            aria-label={t("bibleVerse.close", { defaultValue: "Fechar" })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

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
            title={t("bibleVerse.highlight")}
            onClick={onHighlightClick}
            className="p-1 rounded hover:bg-background text-muted-foreground"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("bibleVerse.clearHighlights")}
            onClick={onClearAll}
            className="p-1 rounded hover:bg-background text-muted-foreground"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-5rem)]">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("bibleVerse.loading")}
            </div>
          ) : parts && parts.length > 0 ? (
            <div
              ref={textRef}
              className={textContainerClass}
              style={fontScale !== 1 ? { fontSize: `${fontScale}rem` } : undefined}
            >
              {isRange || isList ? (
                <p>
                  {parts.map((p, i) => (
                    <span key={p.verse}>
                      {i > 0 ? " " : ""}
                      <sup className="text-[10px] font-semibold opacity-70 mr-0.5">
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
                <p className="text-[11px] opacity-70 italic pt-1">
                  Intervalo grande — mostrando apenas os primeiros {MAX_RANGE} versículos.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic px-4 py-3">
              {t("bibleVerse.notFound")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
