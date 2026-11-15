import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { appConfirm } from "@/components/ui/app-dialogs";
import { cn } from "@/lib/utils";
import { getSearchState, type SearchHit } from "./extensions/search-replace";
import { citationRanges, touchesCitation } from "@/lib/note-search";
import { getActiveLibrary } from "@/lib/bible-notes-store";
import type { BookInfo } from "@/lib/bible-refs";

/**
 * Barra de Localizar e substituir (estilo iOS), presa no topo do editor.
 * Antes de trocar, avisa se a troca atinge uma citação bíblica.
 */
export function RichNoteSearchBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useTranslation();
  const ts = (k: string, d: string, o?: Record<string, unknown>) =>
    t(`personalOutlines.editor.search.${k}`, { defaultValue: d, ...o }) as string;
  const [term, setTerm] = useState("");
  const [repl, setRepl] = useState("");
  const [, force] = useState(0);
  const books = useRef<BookInfo[] | null>(null);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findRef.current?.focus();
    void getActiveLibrary("outlines")
      .then((lib) => { books.current = lib?.books ?? null; })
      .catch(() => { books.current = null; });
    const upd = () => force((n) => (n + 1) % 1_000_000);
    editor.on("transaction", upd);
    return () => {
      editor.off("transaction", upd);
      if (!editor.isDestroyed) editor.commands.setSearchTerm("");
    };
  }, [editor]);

  const st = getSearchState(editor.state);
  const total = st?.hits.length ?? 0;
  const current = total ? (st?.index ?? 0) + 1 : 0;

  const reveal = () =>
    requestAnimationFrame(() => {
      const el = editor.view.dom.querySelector(".search-hit-current");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const onTerm = (v: string) => {
    setTerm(v);
    editor.commands.setSearchTerm(v);
    reveal();
  };
  const step = (d: number) => {
    editor.commands.searchStep(d);
    reveal();
  };

  const bibleCount = (hits: SearchHit[]) =>
    hits.filter((h) => touchesCitation({ start: h.start, end: h.end }, citationRanges(h.blockText, books.current))).length;

  const confirmBible = async (hits: SearchHit[]) => {
    const n = bibleCount(hits);
    if (!n) return true;
    return appConfirm({
      title: ts("bibleTitle", "Texto bíblico na troca"),
      description: ts("bibleWarn", "A troca atinge {{count}} citação(ões) bíblica(s). Isso pode mudar o texto que abre no balão. Trocar mesmo assim?", { count: n }),
      confirmLabel: ts("replaceAnyway", "Trocar mesmo assim"),
      destructive: false,
    });
  };

  const replaceOne = async () => {
    const s = getSearchState(editor.state);
    const hit = s?.hits[s.index];
    if (!hit) return;
    if (!(await confirmBible([hit]))) return;
    editor.commands.replaceCurrentHit(repl);
    reveal();
  };
  const replaceAll = async () => {
    const s = getSearchState(editor.state);
    if (!s?.hits.length) return;
    if (!(await confirmBible(s.hits))) return;
    editor.commands.replaceAllHits(repl);
  };

  const field = "h-10 w-full min-w-0 rounded-full bg-muted px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40";
  const round = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:scale-95 disabled:opacity-30 hover:bg-muted";
  const pill = "h-10 shrink-0 rounded-full px-4 text-sm font-medium active:scale-95 disabled:opacity-40";

  return (
    <div
      className="sticky top-0 z-30 space-y-2 border-b bg-background/95 px-2 py-2 backdrop-blur"
      onClick={(e) => e.stopPropagation()}
      role="search"
      aria-label={ts("title", "Localizar e substituir")}
    >
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <input ref={findRef} className={cn(field, "pr-20")} value={term} placeholder={ts("find", "Buscar…")}
            aria-label={ts("find", "Buscar…")} enterKeyHint="search"
            onChange={(e) => onTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
              if (e.key === "Escape") onClose();
            }} />
          {term && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground" aria-live="polite">
              {total ? ts("count", "{{current}} de {{total}}", { current, total }) : ts("none", "Nada")}
            </span>
          )}
        </div>
        <button type="button" className={round} disabled={!total} aria-label={ts("prev", "Anterior")} onMouseDown={(e) => e.preventDefault()} onClick={() => step(-1)}><ChevronUp className="h-5 w-5" /></button>
        <button type="button" className={round} disabled={!total} aria-label={ts("next", "Próximo")} onMouseDown={(e) => e.preventDefault()} onClick={() => step(1)}><ChevronDown className="h-5 w-5" /></button>
        <button type="button" className={round} aria-label={ts("close", "Fechar busca")} onClick={onClose}><X className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center gap-1">
        <input className={cn(field, "flex-1")} value={repl} placeholder={ts("replaceWith", "Substituir por…")}
          aria-label={ts("replaceWith", "Substituir por…")}
          onChange={(e) => setRepl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} />
        <button type="button" className={cn(pill, "bg-muted text-foreground")} disabled={!total} onMouseDown={(e) => e.preventDefault()} onClick={() => void replaceOne()}>{ts("replace", "Trocar")}</button>
        <button type="button" className={cn(pill, "bg-primary text-primary-foreground")} disabled={!total} onMouseDown={(e) => e.preventDefault()} onClick={() => void replaceAll()}>{ts("replaceAll", "Todos")}</button>
      </div>
    </div>
  );
}
