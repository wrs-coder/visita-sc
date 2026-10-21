// Etapa 4 — Linha do tempo do dia ("Hoje" / "Amanhã") no Dashboard.
// Função pura: só lê dados já carregados e os ordena por horário.
// Itens sem horário vão para o fim, preservando a ordem de entrada.

export type TimelineKind =
  | "schedule"
  | "field"
  | "study"
  | "meal"
  | "meeting"
  | "transport";

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  /** "HH:MM" ou null quando não há horário. */
  time: string | null;
  title: string;
  subtitle?: string | null;
};

export type TimelineSource = TimelineItem & { date: string };

/** Normaliza "8:5", "08:05:00" ou "" para "HH:MM" | null. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{1,2})/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function buildDayTimeline(sources: TimelineSource[], dateIso: string): TimelineItem[] {
  const withTime: Array<TimelineItem & { _i: number }> = [];
  const noTime: TimelineItem[] = [];
  sources.forEach((s, i) => {
    if (s.date !== dateIso) return;
    const { date: _d, ...item } = s;
    const time = normalizeTime(item.time);
    if (time) withTime.push({ ...item, time, _i: i });
    else noTime.push({ ...item, time: null });
  });
  withTime.sort((a, b) => (a.time! < b.time! ? -1 : a.time! > b.time! ? 1 : a._i - b._i));
  return [...withTime.map(({ _i, ...rest }) => rest), ...noTime];
}

/** Agrupa itens por data (yyyy-MM-dd), datas em ordem crescente. */
export function groupByDate<T>(items: T[], getDate: (it: T) => string | null | undefined): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const d = getDate(it);
    if (!d) continue;
    const arr = map.get(d) ?? [];
    arr.push(it);
    map.set(d, arr);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items }));
}

/**
 * Dia/horário "definido pelo Superintendente" (weekday 0 = segunda … 6 = domingo
 * e "HH:MM") → data dentro dos dias da visita + data/hora local ISO.
 */
export function resolveWeekdaySlot(
  weekday: number | null | undefined,
  time: string | null | undefined,
  visitDays: string[],
): { date: string; at: string } | null {
  if (weekday == null || weekday < 0 || weekday > 6) return null;
  const jsDay = (weekday + 1) % 7;
  const date = visitDays.find((iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay() === jsDay;
  });
  if (!date) return null;
  const hhmm = normalizeTime(time) ?? "00:00";
  return { date, at: `${date}T${hhmm}:00` };
}
