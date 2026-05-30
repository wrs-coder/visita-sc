// Local-only view settings + highlights for the Bible verse popover.
// Zero network, zero Supabase. Persisted in localStorage.

export type BibleColor = "white" | "black" | "sepia" | "yellow" | "night_blue";

export interface BibleViewSettings {
  color: BibleColor;
  bold: boolean;
}

export interface BibleHighlight {
  start: number;
  end: number;
}

const SETTINGS_KEY = "bible:view-settings";
const HIGHLIGHTS_KEY = "bible:highlights:v1";

const DEFAULTS: BibleViewSettings = { color: "white", bold: false };

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadSettings(): BibleViewSettings {
  if (typeof window === "undefined") return DEFAULTS;
  const s = safeParse<Partial<BibleViewSettings>>(localStorage.getItem(SETTINGS_KEY), {});
  return {
    color: (s.color ?? DEFAULTS.color) as BibleColor,
    bold: typeof s.bold === "boolean" ? s.bold : DEFAULTS.bold,
  };
}

export function saveSettings(patch: Partial<BibleViewSettings>): BibleViewSettings {
  const next = { ...loadSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

export function highlightKey(libraryId: string, bookId: string, chapter: number, verse: number): string {
  return `${libraryId}|${bookId}|${chapter}|${verse}`;
}

type HighlightMap = Record<string, BibleHighlight[]>;

function loadMap(): HighlightMap {
  if (typeof window === "undefined") return {};
  return safeParse<HighlightMap>(localStorage.getItem(HIGHLIGHTS_KEY), {});
}

function saveMap(map: HighlightMap): void {
  try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

// Normalize: sort by start, merge overlaps, drop empties.
function normalize(list: BibleHighlight[]): BibleHighlight[] {
  const cleaned = list
    .filter((h) => Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .sort((a, b) => a.start - b.start);
  const merged: BibleHighlight[] = [];
  for (const h of cleaned) {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end) {
      last.end = Math.max(last.end, h.end);
    } else {
      merged.push({ start: h.start, end: h.end });
    }
  }
  return merged;
}

export function getHighlights(key: string): BibleHighlight[] {
  return normalize(loadMap()[key] ?? []);
}

export function addHighlight(key: string, h: BibleHighlight): BibleHighlight[] {
  const map = loadMap();
  const next = normalize([...(map[key] ?? []), h]);
  if (next.length === 0) delete map[key]; else map[key] = next;
  saveMap(map);
  return next;
}

export function removeHighlightAt(key: string, offset: number): BibleHighlight[] {
  const map = loadMap();
  const filtered = (map[key] ?? []).filter((h) => !(offset >= h.start && offset < h.end));
  const next = normalize(filtered);
  if (next.length === 0) delete map[key]; else map[key] = next;
  saveMap(map);
  return next;
}

export function clearHighlights(key: string): void {
  const map = loadMap();
  if (map[key]) {
    delete map[key];
    saveMap(map);
  }
}

// Build alternating plain/highlighted segments for a verse text.
export interface VerseSegment { text: string; highlighted: boolean; start: number; end: number; }
export function buildSegments(text: string, highlights: BibleHighlight[]): VerseSegment[] {
  if (!text) return [];
  const hs = normalize(highlights).filter((h) => h.start < text.length);
  if (hs.length === 0) return [{ text, highlighted: false, start: 0, end: text.length }];
  const out: VerseSegment[] = [];
  let cursor = 0;
  for (const h of hs) {
    const start = Math.max(cursor, h.start);
    const end = Math.min(text.length, h.end);
    if (start > cursor) out.push({ text: text.slice(cursor, start), highlighted: false, start: cursor, end: start });
    if (end > start) out.push({ text: text.slice(start, end), highlighted: true, start, end });
    cursor = Math.max(cursor, end);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), highlighted: false, start: cursor, end: text.length });
  return out;
}
