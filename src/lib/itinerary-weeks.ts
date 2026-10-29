import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

export interface WeekLike { week_type: string; start_date: string; end_date: string; notes: string | null }
export interface VisitLike { start_date: string; end_date: string | null }
export interface SuggestedWeek { start: string; end: string; month: string }

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Custom ("Outro") weeks keep their name in notes as "[Nome] obs", because the database only accepts pioneer/free. */
export function parseCustomType(notes: string | null): { name: string | null; rest: string | null } {
  const m = notes?.match(/^\[([^\]]{1,60})\]\s*(.*)$/s);
  if (!m) return { name: null, rest: notes };
  return { name: m[1], rest: m[2].trim() || null };
}

export function buildCustomNotes(name: string, notes: string): string {
  const n = name.trim().replace(/[[\]]/g, "").slice(0, 60);
  return `[${n}]${notes.trim() ? " " + notes.trim() : ""}`;
}

/** Sunday that closes the week of the given start date. */
export function weekEndFor(start: string): string {
  return iso(endOfWeek(parseISO(start), { weekStartsOn: 1 }));
}

/** Plain free week (not "Outro") whose first Monday after the end date has arrived. */
export function isExpiredFreeWeek(w: WeekLike, today: Date): boolean {
  if (w.week_type !== "free" || parseCustomType(w.notes).name) return false;
  const end = parseISO(w.end_date);
  const firstMonday = addDays(startOfWeek(end, { weekStartsOn: 1 }), 7);
  return iso(today) >= iso(firstMonday);
}

const overlaps = (aS: string, aE: string, bS: string, bE: string) => aS <= bE && bS <= aE;

/** Mon–Sun weeks inside months that already have a visit, with no visit and no saved week. */
export function suggestFreeWeeks(visits: VisitLike[], weeks: WeekLike[], today: Date): SuggestedWeek[] {
  const months = new Set(visits.map((v) => v.start_date.slice(0, 7)));
  const todayIso = iso(today);
  const out: SuggestedWeek[] = [];
  for (const month of [...months].sort()) {
    const first = startOfMonth(parseISO(month + "-01"));
    const last = endOfMonth(first);
    let mon = startOfWeek(first, { weekStartsOn: 1 });
    if (mon < first) mon = addDays(mon, 7);
    for (; mon <= last; mon = addDays(mon, 7)) {
      const s = iso(mon), e = iso(addDays(mon, 6));
      if (e < todayIso) continue;
      if (visits.some((v) => overlaps(s, e, v.start_date, v.end_date || v.start_date))) continue;
      if (weeks.some((w) => overlaps(s, e, w.start_date, w.end_date))) continue;
      out.push({ start: s, end: e, month });
    }
  }
  return out;
}
