// Arquivo de troca do Grande Evento entre aparelhos (.visitasc). Leva o programa e os designados,
// nunca PINs, links ou tokens: o aparelho que importa gera os seus.
import type { AssignedTo, EtimPart } from "./etim-import";

export const EVENT_FILE_FORMAT = "visitasc-event";
export const EVENT_FILE_EXT = "visitasc";

export interface EventFileEvent { name: string; event_type: string; event_date: string | null; location: string | null; extra_info: string | null; start_time: string | null }
export interface EventFilePart extends EtimPart { time_mode: string; speaker_congregation: string | null }
export interface EventFile { format: typeof EVENT_FILE_FORMAT; version: 1; event: EventFileEvent; parts: EventFilePart[] }

type SrcPart = Omit<EventFilePart, "talk_includes" | "assigned_to"> & { talk_includes: unknown; assigned_to: string; sort_order: number };

export function buildEventFile(ev: EventFileEvent, parts: SrcPart[]): EventFile {
  return {
    format: EVENT_FILE_FORMAT, version: 1,
    event: { name: ev.name, event_type: ev.event_type, event_date: ev.event_date, location: ev.location, extra_info: ev.extra_info, start_time: ev.start_time },
    parts: [...parts].sort((a, b) => a.sort_order - b.sort_order).map((p) => ({
      part_time: p.part_time, duration_min: p.duration_min, theme: p.theme, outline_number: p.outline_number, instructions: p.instructions,
      part_type_id: p.part_type_id, part_type_label: p.part_type_label, symposium: p.symposium,
      talk_includes: Array.isArray(p.talk_includes) ? p.talk_includes.filter((x): x is string => typeof x === "string") : [],
      assigned_to: p.assigned_to as AssignedTo, time_mode: p.time_mode, speaker_name: p.speaker_name ?? null, speaker_congregation: p.speaker_congregation ?? null,
    })),
  };
}

const s = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ASSIGNED: AssignedTo[] = ["speaker", "co", "branch", "none"];

export function isEventFile(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as Record<string, unknown>).format === EVENT_FILE_FORMAT;
}

/** Valida o arquivo recebido (dados não confiáveis). */
export function parseEventFile(data: unknown): { event: EventFileEvent; parts: EventFilePart[] } {
  if (!isEventFile(data)) throw new Error("Este arquivo não é um evento do Visita SC.");
  const o = data as Record<string, unknown>;
  const e = (o.event ?? {}) as Record<string, unknown>;
  const name = s(e.name, 200);
  if (!name) throw new Error("O arquivo não tem o nome do evento.");
  const time = (v: unknown) => { const t = s(v, 5); return t && /^\d{2}:\d{2}$/.test(t) ? t : null; };
  const date = s(e.event_date, 10);
  const event: EventFileEvent = {
    name, event_type: s(e.event_type, 40) ?? "assembly", event_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    location: s(e.location, 300), extra_info: s(e.extra_info, 2000), start_time: time(e.start_time),
  };
  const raw = Array.isArray(o.parts) ? o.parts.slice(0, 120) : [];
  const parts: EventFilePart[] = raw.filter((p) => p && typeof p === "object").map((r) => {
    const p = r as Record<string, unknown>;
    const d = typeof p.duration_min === "number" && p.duration_min > 0 ? Math.min(600, Math.round(p.duration_min)) : null;
    return {
      part_time: time(p.part_time), duration_min: d, theme: s(p.theme, 300) ?? "", outline_number: s(p.outline_number, 10),
      instructions: s(p.instructions, 2000), part_type_id: s(p.part_type_id, 40), part_type_label: s(p.part_type_label, 80),
      symposium: p.symposium === true,
      talk_includes: Array.isArray(p.talk_includes) ? p.talk_includes.filter((x): x is string => typeof x === "string").slice(0, 10).map((x) => x.slice(0, 200)) : [],
      assigned_to: ASSIGNED.includes(p.assigned_to as AssignedTo) ? (p.assigned_to as AssignedTo) : "speaker",
      time_mode: p.time_mode === "manual" ? "manual" : "auto",
      speaker_name: s(p.speaker_name, 120), speaker_congregation: s(p.speaker_congregation, 120),
    };
  }).filter((p) => p.theme);
  return { event, parts };
}
