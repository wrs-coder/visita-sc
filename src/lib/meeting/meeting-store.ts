// Reuniões de meio de semana: só no aparelho (localStorage por usuário), sem nuvem e sem tabelas.
// O cronômetro reaproveita event-timer.ts com o id "meeting-<id>", sem colidir com Grandes Eventos.
import { SONG_MIN } from "./mwb-import";
import type { TimerPart } from "@/lib/big-events/event-timer";

export type MeetingSection = "open" | "treasures" | "ministry" | "living" | "close";
export interface MeetingPart { id: string; theme: string; minutes: number | null; section: MeetingSection; kind: "song" | "comments" | "part"; assigned: string }
export interface MeetingProgram {
  id: string;
  /** Segunda-feira da semana da apostila (YYYY-MM-DD). */
  monday: string;
  /** Dia da reunião (YYYY-MM-DD), livre: não depende de nenhum compromisso da Agenda. */
  date: string;
  /** Hora de início "HH:MM". */
  start: string;
  title: string;
  parts: MeetingPart[];
  updatedAt: string;
}

const MAX_PROGRAMS = 80;
const key = (userId: string) => `meeting.programs.${userId}`;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SECTIONS: MeetingSection[] = ["open", "treasures", "ministry", "living", "close"];

function sanitizePart(raw: unknown): MeetingPart | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.theme !== "string") return null;
  const min = typeof o.minutes === "number" && Number.isFinite(o.minutes) && o.minutes >= 0 && o.minutes <= 180 ? Math.round(o.minutes) : null;
  return {
    id: o.id.slice(0, 64), theme: o.theme.slice(0, 200), minutes: min,
    section: SECTIONS.includes(o.section as MeetingSection) ? (o.section as MeetingSection) : "open",
    kind: o.kind === "song" || o.kind === "comments" ? o.kind : "part",
    assigned: typeof o.assigned === "string" ? o.assigned.slice(0, 120) : "",
  };
}
export function sanitizeProgram(raw: unknown): MeetingProgram | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.monday !== "string" || !DAY.test(o.monday)) return null;
  return {
    id: o.id.slice(0, 64), monday: o.monday,
    date: typeof o.date === "string" && DAY.test(o.date) ? o.date : o.monday,
    start: typeof o.start === "string" && HM.test(o.start) ? o.start : "19:30",
    title: typeof o.title === "string" ? o.title.slice(0, 200) : "",
    parts: Array.isArray(o.parts) ? o.parts.map(sanitizePart).filter((p): p is MeetingPart => !!p).slice(0, 60) : [],
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date(0).toISOString(),
  };
}
export const sortPrograms = (list: MeetingProgram[]) => [...list].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

export function loadPrograms(userId: string): MeetingProgram[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(raw) ? sortPrograms(raw.map(sanitizeProgram).filter((p): p is MeetingProgram => !!p)) : [];
  } catch { return []; }
}
export function savePrograms(userId: string, list: MeetingProgram[]): void {
  try { localStorage.setItem(key(userId), JSON.stringify(sortPrograms(list).slice(-MAX_PROGRAMS))); } catch { /* cheio */ }
}

/** Junta semanas importadas: substitui só as semanas marcadas em `replace`, as demais existentes ficam. */
export function mergeImported(existing: MeetingProgram[], incoming: MeetingProgram[], replace: Set<string>): MeetingProgram[] {
  const byMonday = new Map(existing.map((p) => [p.monday, p]));
  for (const p of incoming) {
    const old = byMonday.get(p.monday);
    if (old && !replace.has(p.monday)) continue;
    byMonday.set(p.monday, old ? { ...p, id: old.id, date: old.date, start: old.start } : p);
  }
  return sortPrograms([...byMonday.values()]);
}

/** Programa da semana que contém `today` (ou a próxima reunião, se a semana não tiver). */
export function currentProgram(list: MeetingProgram[], today: Date): MeetingProgram | null {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return list.find((p) => p.monday === mon) ?? null;
}

const toMin = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
/** Horário previsto de cada parte: início + soma dos minutos anteriores. */
export function partStarts(p: MeetingProgram): string[] {
  let acc = toMin(p.start);
  return p.parts.map((x) => { const t = fromMin(acc); acc += x.minutes ?? 0; return t; });
}
export const totalMinutes = (p: MeetingProgram) => p.parts.reduce((s, x) => s + (x.minutes ?? 0), 0);
export const timerId = (p: MeetingProgram) => `meeting-${p.id}`;

/** Converte para as partes do cronômetro dos Grandes Eventos (mesma tela de foco). */
export function toTimerParts(p: MeetingProgram): TimerPart[] {
  const starts = partStarts(p);
  return p.parts.map((x, i) => ({
    id: x.id, sort_order: i, theme: x.theme, part_time: starts[i], duration_min: x.minutes ?? (x.kind === "song" ? SONG_MIN : null),
    outline_number: null, part_type_id: x.kind === "song" ? "Song" : null, part_type_label: null,
    // Partes e comentários contam um a um (como partes com orador); só cânticos ficam sem orador.
    assigned_to: x.kind === "song" ? "none" : "speaker", speaker_name: x.assigned || null,
  }));
}

export function newBlankProgram(today: Date): MeetingProgram {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const monday = iso(d); d.setDate(d.getDate() + 1);
  return { id: crypto.randomUUID(), monday, date: iso(d), start: "19:30", title: "", parts: [], updatedAt: new Date().toISOString() };
}
