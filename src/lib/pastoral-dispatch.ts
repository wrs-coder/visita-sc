/**
 * Lógica pura do envio de eventos do Programa da visita (Pastoreio e
 * Recomendações) para o Cronograma e Notas Privadas.
 * Sem React, sem rede — testada em pastoral-dispatch.test.ts.
 */
import type { ElderVisitEventDTO } from "@/lib/elder-program.functions";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** 0 = domingo … 6 = sábado. Prefixos em pt/en/es. */
const DAY_PREFIXES: [number, string[]][] = [
  [0, ["dom", "sun"]],
  [1, ["seg", "mon", "lun"]],
  [2, ["ter", "tue", "mar"]],
  [3, ["qua", "wed", "mie"]],
  [4, ["qui", "thu", "jue"]],
  [5, ["sex", "fri", "vie"]],
  [6, ["sab", "sat"]],
];

function parseWeekday(text: string): number | undefined {
  const words = norm(text).match(/[a-z]+/g) ?? [];
  for (const w of words) {
    if (w.length < 3) continue;
    for (const [d, prefixes] of DAY_PREFIXES) {
      if (prefixes.some((p) => w.startsWith(p))) return d;
    }
  }
  return undefined;
}

function parseTime(text: string): string | undefined {
  const m = norm(text).match(/(\d{1,2})\s*(?::|h)\s*(\d{2})?/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "Domingo, 10:30" + semana da visita → { date: domingo dentro da semana, time: "10:30" }.
 * Campos que não forem entendidos ficam ausentes (o usuário escolhe).
 */
export function parseSlotLabel(
  label: string | null | undefined,
  visitStart: string,
  visitEnd: string,
): { date?: string; time?: string } {
  if (!label) return {};
  const out: { date?: string; time?: string } = {};
  const time = parseTime(label);
  if (time) out.time = time;
  const wd = parseWeekday(label);
  if (wd !== undefined && visitStart && visitEnd) {
    const start = isoToDate(visitStart);
    const end = isoToDate(visitEnd);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() === wd) { out.date = dateToIso(d); break; }
    }
  }
  return out;
}

export interface VisitRef { id: string; congregation_id: string; start_date: string; end_date: string }

/** Campos da nota "Pastoreio" criada a partir de um evento. */
export function pastoralEventToNote(ev: ElderVisitEventDTO, visit: VisitRef, date?: string) {
  const involved = [ev.family_name, ev.family_members].map((s) => s?.trim()).filter(Boolean).join(" — ");
  const additional = [ev.address, ev.spiritual_info].map((s) => s?.trim()).filter(Boolean).join("\n");
  return {
    note_type: "pastoral" as const,
    title: ev.family_name?.trim() || "Pastoreio",
    content: "",
    congregation_id: visit.congregation_id,
    companion: ev.companion?.trim() || null,
    involved_names: involved || null,
    additional_info: additional || null,
    note_date: date ?? parseSlotLabel(ev.slot_label, visit.start_date, visit.end_date).date ?? visit.start_date,
    payload: { source_event_id: ev.id },
  };
}

export const PURPOSE_TO_TIPO: Record<string, string> = {
  ministerial_servant: "Servo ministerial",
  elder: "Ancião",
  cca_change: "CCA",
};

/** Campos da nota "Recomendados" criada a partir de uma recomendação. */
export function recommendationToNote(ev: ElderVisitEventDTO, visit: VisitRef) {
  const corpo: string[] = [];
  if (ev.family_members) corpo.push(`Membros da Família: ${ev.family_members}`);
  if (ev.field_group) corpo.push(`Grupo de campo: ${ev.field_group}`);
  if (ev.info) corpo.push(`Informações: ${ev.info}`);
  const payload: Record<string, string> = { source_event_id: ev.id };
  if (ev.full_name) payload.nome = ev.full_name;
  const tipo = ev.purpose ? PURPOSE_TO_TIPO[ev.purpose] : undefined;
  if (tipo) payload.tipo = tipo;
  if (corpo.length) payload.corpo = corpo.join("\n");
  return {
    note_type: "recomendados" as const,
    title: ev.full_name?.trim() || "Recomendação",
    content: "",
    congregation_id: visit.congregation_id,
    payload,
  };
}

/** Evento do Cronograma a partir de um pastoreio. */
export function pastoralEventToSchedule(
  ev: ElderVisitEventDTO,
  visit: VisitRef,
  date: string,
  time: string | undefined,
) {
  const notes: string[] = [];
  if (ev.slot_label) notes.push(`Dia/Horário: ${ev.slot_label}`);
  if (ev.family_members) notes.push(`Família: ${ev.family_members}`);
  if (ev.spiritual_info) notes.push(`Info: ${ev.spiritual_info}`);
  return {
    event_date: date,
    start_time: time || null,
    end_time: null,
    event_type: "shepherding",
    title: ["Visita de Pastoreio", ev.family_name?.trim()].filter(Boolean).join(" — "),
    location: ev.address?.trim() || null,
    notes: notes.join("\n") || null,
    companion: ev.companion?.trim() || null,
    scope: "congregation",
    congregation_ids: [visit.congregation_id],
    visible_to_spouse: true,
    hide_notes_from_spouse: true,
  };
}

/** Registro no aparelho do que já foi enviado (evita duplicar). */
export type DispatchKind = "cron" | "notas";
const key = (visitId: string) => `program-dispatch.${visitId}`;
export function loadDispatched(visitId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(visitId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
export function saveDispatched(visitId: string, s: Set<string>) {
  try { localStorage.setItem(key(visitId), JSON.stringify([...s])); } catch { /* ignore */ }
}

export function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
