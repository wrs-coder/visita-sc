import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLocalizedBookName } from "@/lib/bible-canon";
import type { CitationMatch, UnknownCitation } from "@/lib/bible-refs";
import { VerseLink } from "./BibleVersePopover";

interface Props {
  citation: UnknownCitation;
  libraryId: string | null;
  fontScale?: number;
  onInsert?: (text: string) => void | Promise<void>;
}

/**
 * Marca uma referência com aparência de citação cujo livro não foi reconhecido
 * e oferece os livros mais próximos como sugestão. Não altera o texto do esboço.
 */
export function UnknownRefLink({ citation, libraryId, fontScale = 1, onInsert }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rawSuggestions =
    citation.suggestions && citation.suggestions.length > 0
      ? citation.suggestions
      : citation.suggestion
        ? [citation.suggestion]
        : [];
  const suggestions = rawSuggestions
    .slice(0, 3)
    .map((s) => ({
      bookId: s.bookId,
      name: getLocalizedBookName(s.bookId, i18n.language) ?? s.displayName,
    }));

  const toMatch = (s: { bookId: string; name: string }): CitationMatch => ({
    raw: `${s.name} ${citation.chapter}:${citation.verse}`,
    bookId: s.bookId,
    bookName: s.name,
    chapter: citation.chapter,
    verse: citation.verse,
    index: 0,
    length: 0,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted decoration-destructive/70 underline-offset-2 text-inherit"
          style={{ fontSize: `${fontScale}em` }}
        >
          {citation.raw}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 max-w-[90vw] p-3 space-y-2 text-sm z-[110]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="flex items-start gap-2 font-medium">
          <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <span>
            {t("bibleRef.notFound", { defaultValue: "Referência não encontrada" })}
          </span>
        </div>
        {suggestions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("bibleRef.didYouMean", { defaultValue: "Você quis dizer:" })}
            </p>
            <div className="space-y-1" onClickCapture={() => setOpen(false)}>
              {suggestions.map((s) => (
                <VerseLink
                  key={s.bookId}
                  match={toMatch(s)}
                  libraryId={libraryId}
                  onInsert={onInsert}
                />
              ))}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
