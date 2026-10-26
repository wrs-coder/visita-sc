// Monta a grade do mês (estilo Google Agenda): semanas de 7 dias começando na
// segunda-feira, com a contagem de eventos e as visitas que cobrem cada dia.
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

export interface MonthCell {
  key: string; // yyyy-MM-dd
  date: Date;
  inMonth: boolean;
  eventCount: number;
  visitIds: string[];
}

export function buildMonthGrid(
  month: Date,
  events: { event_date: string }[],
  visits: { id: string; start_date: string; end_date: string }[],
): MonthCell[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.event_date, (counts.get(e.event_date) ?? 0) + 1);
  const weeks: MonthCell[][] = [];
  let week: MonthCell[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = format(d, "yyyy-MM-dd");
    week.push({
      key,
      date: d,
      inMonth: isSameMonth(d, month),
      eventCount: counts.get(key) ?? 0,
      visitIds: visits.filter((v) => v.start_date <= key && key <= v.end_date).map((v) => v.id),
    });
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  return weeks;
}
