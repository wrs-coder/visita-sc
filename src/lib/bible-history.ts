// Histórico local (sem rede) dos últimos versículos consultados.
export interface BibleHistoryEntry {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  at: number;
}

const KEY = "bible:history:v1";
const MAX = 20;

export function loadVerseHistory(): BibleHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as BibleHistoryEntry[];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushVerseHistory(entry: Omit<BibleHistoryEntry, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const list = loadVerseHistory().filter(
      (e) => !(e.bookId === entry.bookId && e.chapter === entry.chapter && e.verse === entry.verse),
    );
    list.unshift({ ...entry, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function clearVerseHistory(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
