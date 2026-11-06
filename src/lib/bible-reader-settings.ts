// Preferências do leitor de capítulos da aba Bíblia (só neste aparelho).
// Separado de bible-view-settings.ts: a janela de versículo dos Esboços/notas não muda.

export type ReaderBg = "white" | "sepia" | "gray" | "black";
export type ReaderFont = "system" | "serif" | "easy";

export interface ReaderSettings {
  textScale: number;   // 0.8 – 2.0
  bg: ReaderBg;
  font: ReaderFont;
  lineHeight: number;  // 1.4 – 2.2
  /** Brilho da tela enquanto lê (0.1–1) ou null = do sistema. */
  brightness: number | null;
  speechRate: number;  // 0.5 – 2
}

export const READER_BGS: ReaderBg[] = ["white", "sepia", "gray", "black"];
export const READER_FONTS: ReaderFont[] = ["system", "serif", "easy"];
export const READER_SCALE_MIN = 0.8;
export const READER_SCALE_MAX = 2;
export const READER_LINE_MIN = 1.4;
export const READER_LINE_MAX = 2.2;
export const SPEECH_RATES = [0.75, 1, 1.25, 1.5] as const;

const KEY = "bible:reader-settings:v1";
export const READER_DEFAULTS: ReaderSettings = { textScale: 1, bg: "white", font: "system", lineHeight: 1.7, brightness: null, speechRate: 1 };

const clamp = (n: unknown, lo: number, hi: number, fb: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : fb;

export function sanitizeReaderSettings(raw: unknown): ReaderSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof ReaderSettings, unknown>>;
  return {
    textScale: clamp(r.textScale, READER_SCALE_MIN, READER_SCALE_MAX, READER_DEFAULTS.textScale),
    bg: READER_BGS.includes(r.bg as ReaderBg) ? (r.bg as ReaderBg) : READER_DEFAULTS.bg,
    font: READER_FONTS.includes(r.font as ReaderFont) ? (r.font as ReaderFont) : READER_DEFAULTS.font,
    lineHeight: clamp(r.lineHeight, READER_LINE_MIN, READER_LINE_MAX, READER_DEFAULTS.lineHeight),
    brightness: r.brightness == null ? null : clamp(r.brightness, 0.1, 1, 1),
    speechRate: clamp(r.speechRate, 0.5, 2, 1),
  };
}

export function loadReaderSettings(): ReaderSettings {
  try { return sanitizeReaderSettings(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { return { ...READER_DEFAULTS }; }
}

export function saveReaderSettings(patch: Partial<ReaderSettings>): ReaderSettings {
  const next = sanitizeReaderSettings({ ...loadReaderSettings(), ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

/** Sufixo do topo do leitor: ":1-31" (primeiro ao último versículo do capítulo). */
export function chapterVerseSpan(verses: { verse: number }[] | null | undefined): string {
  if (!verses || verses.length === 0) return "";
  let lo = Infinity, hi = -Infinity;
  for (const v of verses) { if (v.verse < lo) lo = v.verse; if (v.verse > hi) hi = v.verse; }
  if (!Number.isFinite(lo)) return "";
  return lo === hi ? `:${lo}` : `:${lo}-${hi}`;
}

/** Destaque já existente com a mesma cor cobrindo todo o intervalo (tocar na mesma cor = remover). */
export function sameColorHighlight<T extends { start: number; end: number; color?: string }>(
  list: T[], range: { start: number; end: number }, color: string,
): T | null {
  return list.find((h) => (h.color ?? "yellow") === color && h.start <= range.start && h.end >= range.end) ?? null;
}
