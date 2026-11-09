// Texto somente leitura com as referências bíblicas em azul, abrindo a Bíblia
// numa janela. O texto salvo não muda: os links são criados só na exibição.
import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { findCitations } from "@/lib/bible-refs";
import { VerseLink } from "@/components/bible/BibleVersePopover";
import { RichOutlineContent } from "@/lib/rich-content";
import { getActiveLibrary, type BibleLibrary } from "@/lib/bible-notes-store";
import { cn } from "@/lib/utils";

let cached: Promise<BibleLibrary | null> | null = null;
function loadLibrary(): Promise<BibleLibrary | null> {
  if (!cached) cached = getActiveLibrary("outlines").catch(() => null);
  return cached;
}

export function BibleRefText({ text, className }: { text: string; className?: string }) {
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  useEffect(() => {
    let alive = true;
    void loadLibrary().then((l) => { if (alive) setLibrary(l); });
    return () => { alive = false; };
  }, []);
  if (!text) return null;
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      <RichOutlineContent html={text} library={library} />
    </div>
  );
}

/**
 * Linha com as referências bíblicas encontradas num texto que está sendo
 * editado (ex.: Notas Privadas): cada uma em azul abre a Bíblia em janela.
 */
export function BibleRefChips({ text, className }: { text: string; className?: string }) {
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  useEffect(() => {
    let alive = true;
    void loadLibrary().then((l) => { if (alive) setLibrary(l); });
    return () => { alive = false; };
  }, []);
  const matches = useMemo(() => (library ? findCitations(library.books, text) : []), [library, text]);
  if (!library || matches.length === 0) return null;
  const seen = new Set<string>();
  const unique = matches.filter((m) => (seen.has(m.raw) ? false : (seen.add(m.raw), true)));
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", className)}>
      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {unique.map((m, i) => <VerseLink key={`${m.raw}-${i}`} match={m} libraryId={library.id} />)}
    </div>
  );
}
