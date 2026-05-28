import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, BookOpen } from "lucide-react";
import { getVerse } from "@/lib/bible-notes-store";
import type { BibleLang, CitationMatch } from "@/lib/bible-refs";
import { cn } from "@/lib/utils";

interface VerseLinkProps {
  match: CitationMatch;
  lang: BibleLang;
  className?: string;
}

/**
 * Link clicável (azul) que abre um popover com o texto do versículo
 * carregado do IndexedDB. Usado no Modo Esboço.
 */
export function VerseLink({ match, lang, className }: VerseLinkProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || text !== null) return;
    setLoading(true);
    getVerse(lang, match.bookId, match.chapter, match.verse).then((rec) => {
      setText(rec?.text ?? "");
      setLoading(false);
    });
  }, [open, lang, match.bookId, match.chapter, match.verse, text]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-sky-600 dark:text-sky-400 underline-offset-2 hover:underline font-medium",
            className,
          )}
        >
          {match.raw}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[90vw]" align="start">
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
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
        ) : text ? (
          <p className="text-sm leading-relaxed">{text}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t("bibleVerse.notFound")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
