import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History, Trash2 } from "lucide-react";
import { getLocalizedBookName } from "@/lib/bible-canon";
import type { CitationMatch } from "@/lib/bible-refs";
import type { BibleLibrary } from "@/lib/bible-notes-store";
import {
  loadVerseHistory,
  clearVerseHistory,
  type BibleHistoryEntry,
} from "@/lib/bible-history";
import { VerseLink } from "./BibleVersePopover";

/**
 * Lista dos últimos versículos abertos (apenas local, sem rede).
 * Atualiza ao focar a janela para refletir consultas feitas no modo leitura.
 */
export function BibleHistoryChips({
  library,
  onInsert,
}: {
  library: BibleLibrary | null;
  onInsert?: (text: string) => void | Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<BibleHistoryEntry[]>([]);

  useEffect(() => {
    const refresh = () => setItems(loadVerseHistory());
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  if (!library || items.length === 0) return null;

  const toMatch = (e: BibleHistoryEntry): CitationMatch => {
    const name = getLocalizedBookName(e.bookId, i18n.language) ?? e.bookName;
    return {
      raw: `${name} ${e.chapter}:${e.verse}`,
      bookId: e.bookId,
      bookName: name,
      chapter: e.chapter,
      verse: e.verse,
      index: 0,
      length: 0,
    };
  };

  return (
    <div className="space-y-1.5 pt-1 border-t">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          {t("bibleHistory.title", { defaultValue: "Consultas recentes" })}
        </span>
        <button
          type="button"
          onClick={() => { clearVerseHistory(); setItems([]); }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3 w-3" />
          {t("bibleHistory.clear", { defaultValue: "Limpar" })}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-w-full min-w-0">
        {items.slice(0, 12).map((e) => (
          <VerseLink
            key={`${e.bookId}-${e.chapter}-${e.verse}-${e.at}`}
            match={toMatch(e)}
            libraryId={library.id}
            className="text-xs"
            onInsert={onInsert}
          />
        ))}
      </div>
    </div>
  );
}
