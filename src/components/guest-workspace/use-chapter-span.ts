// Intervalo de versículos de um capítulo (ex.: ":1-27"), lido da Bíblia
// importada no aparelho. Sem Bíblia importada devolve "" (mostra só o capítulo).
import { useEffect, useState } from "react";
import { getActiveLibrary, getChapterFromLibrary } from "@/lib/bible-notes-store";
import { chapterVerseSpan } from "@/lib/bible-reader-settings";

const memo = new Map<string, string>();

export function useChapterSpan(chapterKey: string | null | undefined): string {
  const [span, setSpan] = useState(() => (chapterKey ? memo.get(chapterKey) ?? "" : ""));
  useEffect(() => {
    if (!chapterKey) { setSpan(""); return; }
    const hit = memo.get(chapterKey);
    if (hit !== undefined) { setSpan(hit); return; }
    let alive = true;
    void (async () => {
      const [book, chStr] = chapterKey.split(":");
      const lib = await getActiveLibrary().catch(() => null);
      if (!lib) return;
      const v = await getChapterFromLibrary(lib.id, book, Number(chStr)).catch(() => []);
      const s = chapterVerseSpan(v);
      memo.set(chapterKey, s);
      if (alive) setSpan(s);
    })();
    return () => { alive = false; };
  }, [chapterKey]);
  return span;
}
