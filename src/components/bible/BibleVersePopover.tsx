import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, BookOpen } from "lucide-react";
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

  useEffect(() => {
    if (!open || parts !== null) return;
    if (!libraryId) {
      setParts([]);
      return;
    }
    setLoading(true);

    const start = match.verse;
    let end = match.verseEnd && match.verseEnd > start ? match.verseEnd : start;
    let cappedTruncation = false;
    if (end - start + 1 > MAX_RANGE) {
      end = start + MAX_RANGE - 1;
      cappedTruncation = true;
    }
    const nums: number[] = [];
    for (let v = start; v <= end; v++) nums.push(v);

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
  }, [open, libraryId, match.bookId, match.chapter, match.verse, match.verseEnd, parts]);

  const isRange = match.verseEnd && match.verseEnd > match.verse;

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
      <PopoverContent className="w-80 max-w-[90vw] max-h-[60vh] overflow-y-auto z-[60]" align="start">
      <PopoverContent className="w-80 max-w-[90vw] max-h-[60vh] overflow-y-auto z-[110]" align="start">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">
            {match.bookName} {match.chapter}:{match.verse}
            {match.verseEnd ? `-${match.verseEnd}` : ""}
          </span>
        </div>
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

            {isRange ? (
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
      </PopoverContent>
    </Popover>
  );
}
