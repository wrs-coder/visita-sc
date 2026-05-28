import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, BookOpen, GripHorizontal, X } from "lucide-react";
import { getVerseFromLibrary } from "@/lib/bible-notes-store";
import type { CitationMatch } from "@/lib/bible-refs";
import { cn } from "@/lib/utils";

interface VerseLinkProps {
  match: CitationMatch;
  libraryId: string | null;
  className?: string;
  fontScale?: number;
}


const MAX_RANGE = 10;

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

  // Offset de arrasto aplicado via margin (não conflita com o transform do
  // Floating UI/Radix). Resetado sempre que o popup fecha.
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    if (!open) setOffset({ x: 0, y: 0 });
  }, [open]);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Só com botão principal/toque
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
    // Clamp dentro da viewport (margem 8px) usando o retângulo atual.
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
      // Lista discreta (vírgulas): busca exatamente esses versos.
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

  const isList = Boolean(match.verses && match.verses.length > 1);
  const isRange = !isList && match.verseEnd && match.verseEnd > match.verse;
  const headerVerses = isList
    ? match.verses!.join(",")
    : match.verseEnd
      ? `${match.verse}-${match.verseEnd}`
      : `${match.verse}`;

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
        className="w-80 max-w-[90vw] max-h-[60vh] overflow-hidden z-[110] p-0"
        align="start"
        style={{ marginLeft: offset.x, marginTop: offset.y }}
        // Evita que o Radix feche o popup ao clicar dentro durante o arrasto.
        onOpenAutoFocus={(e) => e.preventDefault()}
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
        <div className="px-4 py-3 overflow-y-auto max-h-[calc(60vh-2.25rem)]">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("bibleVerse.loading")}
            </div>
          ) : parts && parts.length > 0 ? (
            <div
              className="text-sm leading-relaxed space-y-1.5"
              style={fontScale !== 1 ? { fontSize: `${fontScale}rem` } : undefined}
            >
              {isRange || isList ? (
                <p>
                  {parts.map((p, i) => (
                    <span key={p.verse}>
                      {i > 0 ? " " : ""}
                      <sup className="text-[10px] font-semibold text-muted-foreground mr-0.5">
                        {p.verse}
                      </sup>
                      {p.text}
                    </span>
                  ))}
                </p>
              ) : (
                <p>{parts[0].text}</p>
              )}
              {truncated && (
                <p className="text-[11px] text-muted-foreground italic pt-1">
                  Intervalo grande — mostrando apenas os primeiros {MAX_RANGE} versículos.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t("bibleVerse.notFound")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
