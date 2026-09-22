import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, History, Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { findCitations, type CitationMatch } from "@/lib/bible-refs";
import { searchVersesInLibrary, type BibleLibrary, type BibleSearchHit } from "@/lib/bible-notes-store";
import { loadVerseHistory, clearVerseHistory, type BibleHistoryEntry } from "@/lib/bible-history";
import { VerseLink } from "./BibleVersePopover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: BibleLibrary | null;
}

/**
 * Busca na Bíblia local (offline): por referência ("João 3:16") ou por
 * trecho de texto. Mostra também o histórico das últimas consultas.
 */
export function BibleSearchDialog({ open, onOpenChange, library }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<BibleSearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BibleHistoryEntry[]>([]);

  useEffect(() => {
    if (open) setHistory(loadVerseHistory());
  }, [open]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Referência digitada diretamente (ex.: "Sl 23:1-3").
  const refMatch = useMemo<CitationMatch | null>(() => {
    if (!library || !debounced) return null;
    const found = findCitations(library.books, debounced);
    return found.length > 0 ? found[0] : null;
  }, [library, debounced]);

  useEffect(() => {
    if (!open || !library || debounced.length < 3 || refMatch) {
      setHits(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchVersesInLibrary(library.id, debounced, 50)
      .then((r) => { if (!cancelled) { setHits(r); setLoading(false); } })
      .catch(() => { if (!cancelled) { setHits([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [open, library, debounced, refMatch]);

  const toMatch = (bookId: string, chapter: number, verse: number): CitationMatch => {
    const name = getLocalizedBookName(bookId, i18n.language)
      ?? library?.books.find((b) => b.bookId === bookId)?.displayName
      ?? bookId;
    return {
      raw: `${name} ${chapter}:${verse}`,
      bookId, bookName: name, chapter, verse, index: 0, length: 0,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            {t("bibleSearch.title", { defaultValue: "Buscar na Bíblia" })}
          </DialogTitle>
        </DialogHeader>

        {!library ? (
          <p className="text-sm text-muted-foreground">
            {t("bibleSearch.noLibrary", { defaultValue: "Importe uma Bíblia para usar a busca." })}
          </p>
        ) : (
          <>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("bibleSearch.placeholder", {
                defaultValue: "Referência (João 3:16) ou palavras do texto",
              })}
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {refMatch && (
                <div className="rounded-md border p-2 text-sm">
                  <VerseLink match={refMatch} libraryId={library.id} />
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("bibleSearch.searching", { defaultValue: "Buscando..." })}
                </div>
              )}

              {!loading && hits && hits.length === 0 && debounced.length >= 3 && (
                <p className="text-sm text-muted-foreground italic py-2">
                  {t("bibleSearch.empty", { defaultValue: "Nenhum versículo encontrado." })}
                </p>
              )}

              {!loading && hits && hits.length > 0 && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {t("bibleSearch.results", {
                      defaultValue: "{{n}} resultado(s)",
                      n: hits.length,
                    })}
                  </p>
                  {hits.map((h) => (
                    <div key={`${h.bookId}-${h.chapter}-${h.verse}`} className="rounded-md border p-2">
                      <VerseLink
                        match={toMatch(h.bookId, h.chapter, h.verse)}
                        libraryId={library.id}
                        className="text-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{h.text}</p>
                    </div>
                  ))}
                </>
              )}

              {!debounced && history.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      {t("bibleSearch.history", { defaultValue: "Consultas recentes" })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => { clearVerseHistory(); setHistory([]); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("bibleSearch.clearHistory", { defaultValue: "Limpar" })}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((h) => (
                      <VerseLink
                        key={`${h.bookId}-${h.chapter}-${h.verse}-${h.at}`}
                        match={toMatch(h.bookId, h.chapter, h.verse)}
                        libraryId={library.id}
                        className="text-xs"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
