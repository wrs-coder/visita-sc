// Retorno ao Leitor da Bíblia depois de Anotar/Ponto alto (só nesta sessão do aparelho).
export interface ReaderReturn { track: string; chapterKey: string; readingDay: number | null; verse: number | null }
const KEY = "bible.reader.return";

/** Extrai o primeiro versículo de "Provérbios 22:11-13" → 11. */
export function verseFromRef(ref: string): number | null {
  const m = /:(\d+)/.exec(ref);
  return m ? Number(m[1]) : null;
}
export function setReaderReturn(r: ReaderReturn): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch { /* */ }
}
export function consumeReaderReturn(): ReaderReturn | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as ReaderReturn;
    return typeof r?.chapterKey === "string" && r.chapterKey.includes(":") ? r : null;
  } catch { return null; }
}
