// Três leituras da Bíblia (Pessoal, Família, Reunião), leitura por dias da
// semana e semana da reunião. Tudo puro e local: nada vai para o servidor.
import { ALL_BOOKS, chapterSequence, chaptersOf, isValidChapterKey, type Highlight } from "./bible-chapters";

export type Track = "personal" | "family" | "meeting";
export const TRACKS: Track[] = ["personal", "family", "meeting"];

/** Dias 0=domingo..6=sábado: livros de cada dia e onde parou. */
export interface WeekdayPlan {
  enabled: boolean; days: string[][]; pos: (string | null)[];
  /** 0=dom..6=sáb: data (AAAA-MM-DD) da ocorrência de cada dia já lida. Vai no backup. */
  lastRead?: (string | null)[];
  /** Dia em que a contagem de atraso começou (piso para dias sem data). */
  since?: string;
}
/** Semana da reunião: ponto de partida e ritmo; avança sozinha toda segunda. */
export interface MeetingWeek { anchorMonday: string; startKey: string; perWeek: number }

export const emptyWeekday = (): WeekdayPlan => ({ enabled: false, days: Array.from({ length: 7 }, () => []), pos: Array(7).fill(null) });

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return iso(x);
}

const CANON = chapterSequence("canon");

/** Capítulos da semana da reunião que contém `today`. */
export function meetingWeekKeys(mw: MeetingWeek | undefined, today: Date): string[] {
  if (!mw) return [];
  const start = CANON.indexOf(mw.startKey);
  if (start < 0) return [];
  const a = new Date(`${mw.anchorMonday}T00:00:00`).getTime();
  const b = new Date(`${mondayOf(today)}T00:00:00`).getTime();
  const weeks = Math.round((b - a) / (7 * 86_400_000));
  const from = start + weeks * mw.perWeek;
  if (from < 0 || from >= CANON.length) return [];
  return CANON.slice(from, from + mw.perWeek);
}

/** Sequência de capítulos de um dia da semana. */
export function weekdaySeq(plan: WeekdayPlan, day: number): string[] {
  return (plan.days[day] ?? []).flatMap((b) => Array.from({ length: chaptersOf(b) }, (_, i) => `${b}:${i + 1}`));
}

/** Onde continuar naquele dia (null = dia sem leitura). */
export function weekdayCurrent(plan: WeekdayPlan, day: number): string | null {
  const seq = weekdaySeq(plan, day);
  if (!seq.length) return null;
  const p = plan.pos[day];
  return p && seq.includes(p) ? p : seq[0];
}

/** Depois de ler `key`, avança no dia; no fim recomeça do primeiro livro. */
export function weekdayAdvance(plan: WeekdayPlan, day: number, key: string): WeekdayPlan {
  const seq = weekdaySeq(plan, day);
  if (!seq.length) return plan;
  const i = seq.indexOf(key);
  const next = i < 0 ? seq[0] : seq[(i + 1) % seq.length];
  const pos = [...plan.pos]; pos[day] = next;
  return { ...plan, pos };
}

export const trackOf = (h: Highlight): Track => h.track ?? "personal";

export function filterByTrack(list: Highlight[], track: Track | null): Highlight[] {
  return track ? list.filter((h) => trackOf(h) === track) : list;
}

/** "Para comentar": pontos altos da reunião desta semana e os marcados com ★. */
export function commentList(list: Highlight[], today: Date): Highlight[] {
  const mon = mondayOf(today);
  return list
    .filter((h) => h.star || (trackOf(h) === "meeting" && h.date.slice(0, 10) >= mon))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function sanitizeWeekday(raw: unknown): WeekdayPlan | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = Array.isArray(o.days) ? o.days[i] : null;
    return Array.isArray(d) ? [...new Set(d.filter((b): b is string => typeof b === "string" && ALL_BOOKS.includes(b)))].slice(0, 66) : [];
  });
  const pos = Array.from({ length: 7 }, (_, i) => {
    const p = Array.isArray(o.pos) ? o.pos[i] : null;
    return typeof p === "string" && isValidChapterKey(p) ? p : null;
  });
  const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v);
  const out: WeekdayPlan = { enabled: o.enabled === true, days, pos };
  if (Array.isArray(o.lastRead)) out.lastRead = Array.from({ length: 7 }, (_, i) => (isIso((o.lastRead as unknown[])[i]) ? (o.lastRead as string[])[i] : null));
  if (isIso(o.since)) out.since = o.since;
  return out;
}

export function sanitizeMeetingWeek(raw: unknown): MeetingWeek | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.anchorMonday !== "string" || !/^\d{4}-\d\d-\d\d$/.test(o.anchorMonday)) return undefined;
  if (typeof o.startKey !== "string" || !isValidChapterKey(o.startKey)) return undefined;
  const n = typeof o.perWeek === "number" && Number.isInteger(o.perWeek) && o.perWeek >= 1 && o.perWeek <= 20 ? o.perWeek : null;
  if (!n) return undefined;
  return { anchorMonday: o.anchorMonday, startKey: o.startKey, perWeek: n };
}

/** Primeiro capítulo do dia ainda não lido (null = dia vazio ou tudo lido). */
export function weekdayNextUnread(plan: WeekdayPlan, day: number, read: Set<string>): string | null {
  return weekdaySeq(plan, day).find((k) => !read.has(k)) ?? null;
}

/** Dia com leitura e todos os capítulos marcados. */
export function weekdayDayDone(plan: WeekdayPlan, day: number, read: Set<string>): boolean {
  const seq = weekdaySeq(plan, day);
  return seq.length > 0 && seq.every((k) => read.has(k));
}

/** Progresso da meta "Dias": capítulos de todos os livros dos dias (sem livros = Bíblia toda). */
export function weekdayProgress(plan: WeekdayPlan, read: Set<string>, totalBible: number): { done: number; total: number; percent: number } {
  const keys = new Set<string>();
  for (let d = 0; d < 7; d++) for (const k of weekdaySeq(plan, d)) keys.add(k);
  const total = keys.size || totalBible;
  const done = keys.size ? [...keys].filter((k) => read.has(k)).length : read.size;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Livro → dias da semana (0=dom..6=sáb, ordem seg→dom) em que ele está no plano "Dias". */
export function weekdayBookDays(plan: WeekdayPlan): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const d of [1, 2, 3, 4, 5, 6, 0]) for (const b of plan.days[d] ?? []) {
    const list = m.get(b) ?? []; if (!list.includes(d)) list.push(d); m.set(b, list);
  }
  return m;
}
