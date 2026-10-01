// Local-only view settings + highlights for the Bible verse popover.
// Zero network, zero Supabase. Persisted in localStorage.

export type BibleColor = "white" | "black" | "sepia" | "yellow" | "night_blue";
export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";
export const HIGHLIGHT_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];

export const TEXT_SCALE_MIN = 0.8;
export const TEXT_SCALE_MAX = 1.8;
export const TEXT_SCALE_STEP = 0.1;
export const POPOVER_HEIGHT_MIN = 120;

export interface BibleViewSettings {
  color: BibleColor;
  bold: boolean;
  /** Escala só do texto bíblico (1 = padrão). */
  textScale: number;
  /** Altura escolhida para a área de texto, em px (null = automática). */
  height: number | null;
  /** Última cor de destaque usada. */
  highlightColor: HighlightColor;
}

export interface BibleHighlight {
  start: number;
  end: number;
  /** Ausente em registros antigos = amarelo. */
  color?: HighlightColor;
}

const SETTINGS_KEY = "bible:view-settings";
const HIGHLIGHTS_KEY = "bible:highlights:v1";

const DEFAULTS: BibleViewSettings = {
  color: "white", bold: false, textScale: 1, height: null, highlightColor: "yellow",
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function clampTextScale(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  const c = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, n));
  return Math.round(c * 10) / 10;
}

export function clampHeight(v: unknown, viewportHeight: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const max = Math.max(POPOVER_HEIGHT_MIN, viewportHeight - 160);
  return Math.round(Math.min(max, Math.max(POPOVER_HEIGHT_MIN, v)));
}

function isHighlightColor(v: unknown): v is HighlightColor {
  return typeof v === "string" && (HIGHLIGHT_COLORS as string[]).includes(v);
}

export function loadSettings(): BibleViewSettings {
  if (typeof window === "undefined") return DEFAULTS;
  const s = safeParse<Partial<BibleViewSettings>>(localStorage.getItem(SETTINGS_KEY), {});
  return {
    color: (s.color ?? DEFAULTS.color) as BibleColor,
    bold: typeof s.bold === "boolean" ? s.bold : DEFAULTS.bold,
    textScale: clampTextScale(s.textScale),
    height: typeof s.height === "number" && Number.isFinite(s.height) ? s.height : null,
    highlightColor: isHighlightColor(s.highlightColor) ? s.highlightColor : DEFAULTS.highlightColor,
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

function colorOf(h: BibleHighlight): HighlightColor {
  return isHighlightColor(h.color) ? h.color : "yellow";
}

/** Sort, merge overlaps of the same color, drop empties. Output always has explicit color. */
export function normalize(list: BibleHighlight[]): Required<BibleHighlight>[] {
  const cleaned = list
    .filter((h) => h && Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .map((h) => ({ start: h.start, end: h.end, color: colorOf(h) }))
    .sort((a, b) => a.start - b.start);
  const merged: Required<BibleHighlight>[] = [];
  for (const h of cleaned) {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end && last.color === h.color) {
      last.end = Math.max(last.end, h.end);
    } else if (last && h.start < last.end) {
      // Cores diferentes sobrepostas (dados inesperados): o anterior vence.
      if (h.end > last.end) merged.push({ start: last.end, end: h.end, color: h.color });
    } else {
      merged.push(h);
    }
  }
  return merged;
}

/** Adiciona um trecho; a nova cor substitui o que estava por baixo. */
export function applyHighlight(list: BibleHighlight[], h: BibleHighlight): Required<BibleHighlight>[] {
  const cut: BibleHighlight[] = [];
  for (const e of normalize(list)) {
    if (e.end <= h.start || e.start >= h.end) { cut.push(e); continue; }
    if (e.start < h.start) cut.push({ ...e, end: h.start });
    if (e.end > h.end) cut.push({ ...e, start: h.end });
  }
  return normalize([...cut, { ...h, color: colorOf(h) }]);
}

export function getHighlights(key: string): Required<BibleHighlight>[] {
  return normalize(loadMap()[key] ?? []);
}

export function addHighlight(key: string, h: BibleHighlight): Required<BibleHighlight>[] {
  const map = loadMap();
  const next = applyHighlight(map[key] ?? [], h);
  if (next.length === 0) delete map[key]; else map[key] = next;
  saveMap(map);
  return next;
}

export function removeHighlightAt(key: string, offset: number): Required<BibleHighlight>[] {
  const map = loadMap();
  const next = normalize(map[key] ?? []).filter((h) => !(offset >= h.start && offset < h.end));
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
export interface VerseSegment {
  text: string;
  highlighted: boolean;
  start: number;
  end: number;
  color?: HighlightColor;
}
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
    if (end > start) out.push({ text: text.slice(start, end), highlighted: true, start, end, color: h.color });
    cursor = Math.max(cursor, end);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), highlighted: false, start: cursor, end: text.length });
  return out;
}

/** Versículo vizinho dentro do capítulo carregado (null no início/fim). */
export function neighborVerse(verses: number[], current: number, delta: -1 | 1): number | null {
  const sorted = [...verses].sort((a, b) => a - b);
  if (delta > 0) return sorted.find((v) => v > current) ?? null;
  for (let i = sorted.length - 1; i >= 0; i--) if (sorted[i] < current) return sorted[i];
  return null;
}
