import { parseSlotLabel } from "./pastoral-dispatch";

/** Estado das pílulas de dia/horário do pastoreio (visão dos anciãos). */
export interface SlotEvent { id: string; slot_label: string | null }

const WEEK = ["2026-11-01", "2026-11-07"] as const;
const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Saved labels keep their existing Portuguese format regardless of UI language. */
export function slotKey(label: string): string {
  const p = parseSlotLabel(label, WEEK[0], WEEK[1]);
  return p.date && p.time ? `${p.date}|${p.time}` : label.trim();
}

export function slotTaken(label: string, used: Iterable<string>): boolean {
  return Array.from(used).some((s) => slotKey(s) === slotKey(label));
}

export function visitWeekdays(start: string, end: string): number[] {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || first > last) return [];
  const days: number[] = [];
  for (const d = new Date(first); d <= last && days.length < 7; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (!days.includes(day)) days.push(day);
  }
  return days;
}

export function customSlotLabel(day: number, time: string, start: string, end: string): string | null {
  const name = DAY_NAMES[day];
  if (!name || !visitWeekdays(start, end).includes(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return `${name}, ${time}`;
}

export function visitSlotOptions(slots: string[], events: SlotEvent[]): string[] {
  const out = [...slots];
  for (const e of events) {
    if (!e.slot_label) continue;
    const p = parseSlotLabel(e.slot_label, WEEK[0], WEEK[1]);
    if (p.date && p.time && !out.includes(e.slot_label)) out.push(e.slot_label);
  }
  return out;
}

export function slotState(slots: string[], events: SlotEvent[]) {
  slots = visitSlotOptions(slots, events);
  const used = slots.filter((s) => events.some((e) => e.slot_label === s));
  const free = slots.filter((s) => !used.includes(s));
  const withSlot = events.filter((e) => e.slot_label && slots.includes(e.slot_label)).length;
  const remaining = Math.max(0, events.length - withSlot);
  return { used, free, total: events.length, remaining, full: remaining === 0 };
}

export function nextEventWithoutSlot<T extends SlotEvent>(slots: string[], events: T[]): T | undefined {
  slots = visitSlotOptions(slots, events);
  return events.find((e) => !e.slot_label || !slots.includes(e.slot_label));
}

export const NO_SLOT = "__none__";
/** Qual pastoreio mostrar (um dia por vez): mantém o atual se ainda existir. */
export function pickElderSlot(used: string[], current: string | null, hasUnslotted: boolean): string {
  if (current && (used.includes(current) || (current === NO_SLOT && hasUnslotted))) return current;
  return used[0] ?? NO_SLOT;
}
