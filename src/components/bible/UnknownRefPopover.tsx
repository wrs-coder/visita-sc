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
}

/**
 * Marca uma referência com aparência de citação cujo livro não foi reconhecido
 * e oferece o livro mais próximo como sugestão. Não altera o texto do esboço.
 */
export function UnknownRefLink({ citation, libraryId, fontScale = 1 }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const s = citation.suggestion;
  const suggestedName = s
    ? getLocalizedBookName(s.bookId, i18n.language) ?? s.displayName
    : null;

  const suggestedMatch: CitationMatch | null =
    s && suggestedName
      ? {
          raw: `${suggestedName} ${citation.chapter}:${citation.verse}`,
          bookId: s.bookId,
          bookName: suggestedName,
          chapter: citation.chapter,
          verse: citation.verse,
          index: 0,
          length: 0,
        }
      : null;

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
      <PopoverContent className="w-64 p-3 space-y-2 text-sm" align="start">
        <div className="flex items-start gap-2 font-medium">
          <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <span>
            {t("bibleRef.notFound", { defaultValue: "Referência não encontrada" })}
          </span>
        </div>
        {suggestedMatch ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("bibleRef.didYouMean", { defaultValue: "Você quis dizer:" })}
            </p>
            <VerseLink match={suggestedMatch} libraryId={libraryId} />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
