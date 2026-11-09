/**
 * Registro local (somente no aparelho) das leituras pessoal/família.
 *
 * - `bible.readDay.<track>`: último dia em que algum capítulo foi marcado
 *   (usado pelos lembretes e como ponto de partida de aparelhos antigos).
 * - `bible.readDay.<track>.byWeekday`: para cada dia da semana (0=dom..6=sáb),
 *   a data da ocorrência daquele dia que já foi lida.
 *
 * Regra do atraso (meta "Dias"), individual por dia da semana: o domingo só
 * fica atrasado depois que um domingo programado passa sem leitura daquele
 * domingo. Ler o domingo atrasado durante a semana tira o atraso.
 */
import { weekdaySeq, weekdayDayDone, type WeekdayPlan } from "./bible-tracks";

export type ReadTrack = "personal" | "family";
/** 7 posições (0=dom..6=sáb): data (AAAA-MM-DD) da ocorrência já lida. */
export type WeekdayLog = (string | null)[];

const KEY = (t: ReadTrack) => `bible.readDay.${t}`;
const WKEY = (t: ReadTrack) => `bible.readDay.${t}.byWeekday`;
/** Ordem de exibição: segunda → domingo. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function isoDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function markReadToday(t: ReadTrack, d = new Date()): void {
  try { localStorage.setItem(KEY(t), isoDay(d)); } catch { /* */ }
}

export function lastReadDay(t: ReadTrack): string | null {
  try { return localStorage.getItem(KEY(t)); } catch { return null; }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function weekdayLog(t: ReadTrack): WeekdayLog {
  try {
    const raw = JSON.parse(localStorage.getItem(WKEY(t)) ?? "null");
    if (Array.isArray(raw)) return Array.from({ length: 7 }, (_, i) => (typeof raw[i] === "string" && ISO.test(raw[i]) ? raw[i] : null));
  } catch { /* */ }
  return Array(7).fill(null);
}

/** Última ocorrência do dia da semana `day` antes de hoje (hoje não conta). */
export function prevOccurrence(day: number, now = new Date()): string {
  const back = ((now.getDay() - day + 7) % 7) || 7;
  return isoDay(addDays(now, -back));
}
function nextOccurrence(day: number, now: Date): string {
  const fwd = ((day - now.getDay() + 7) % 7) || 7;
  return isoDay(addDays(now, fwd));
}

/**
 * Qual ocorrência do dia `day` a leitura de hoje cobre: hoje, se for o
 * próprio dia; senão a anterior ainda não lida (leitura atrasada em dia) ou,
 * se ela já foi lida, a próxima (leitura adiantada).
 */
export function slotFor(day: number, stored: string | null, now = new Date()): string {
  if (now.getDay() === day) return isoDay(now);
  const prev = prevOccurrence(day, now);
  return !stored || stored < prev ? prev : nextOccurrence(day, now);
}

/** Resultado puro: registro atualizado depois de ler o dia `day` hoje. */
export function creditLog(log: WeekdayLog, day: number, now = new Date()): WeekdayLog {
  const out = [...log];
  const slot = slotFor(day, log[day] ?? null, now);
  if (!out[day] || out[day]! < slot) out[day] = slot;
  return out;
}

/** Grava a leitura do dia da semana `day` (e o "último dia lido" geral). */
export function creditWeekday(t: ReadTrack, day: number, now = new Date()): void {
  markReadToday(t, now);
  try { localStorage.setItem(WKEY(t), JSON.stringify(creditLog(weekdayLog(t), day, now))); } catch { /* */ }
}

/**
 * Dias da semana (ordem seg→dom) com leitura atrasada.
 * Um dia programado e ainda não concluído fica atrasado quando a última
 * ocorrência dele (antes de hoje) não foi lida. Sem registro por dia, usa o
 * "último dia lido" geral; sem nenhum registro, só conta o dia já começado
 * (algum capítulo marcado) para não acusar atraso num plano recém-criado.
 */
export function lateWeekdays(plan: WeekdayPlan | undefined, last: string | null, now = new Date(), read?: Set<string>, log?: WeekdayLog): number[] {
  if (!plan?.enabled) return [];
  const r = read ?? new Set<string>();
  const out: number[] = [];
  for (const d of ORDER) {
    const seq = weekdaySeq(plan, d);
    if (!seq.length || weekdayDayDone(plan, d, r)) continue;
    const stored = log?.[d] ?? last;
    if (stored) { if (stored < prevOccurrence(d, now)) out.push(d); }
    else if (read && seq.some((k) => read.has(k))) out.push(d);
  }
  return out;
}

/** Quantidade de dias da semana com leitura atrasada. 0 = em dia. */
export function overdueDays(plan: WeekdayPlan | undefined, last: string | null, now = new Date(), read?: Set<string>, log?: WeekdayLog): number {
  return lateWeekdays(plan, last, now, read, log).length;
}

/** Hoje há leitura programada (meta Dias) e a leitura de hoje não foi marcada. */
export function weekdayPending(plan: WeekdayPlan | undefined, read: Set<string>, last: string | null, now = new Date(), log?: WeekdayLog): boolean {
  if (!plan?.enabled) return false;
  const day = now.getDay();
  if (!weekdaySeq(plan, day).length || weekdayDayDone(plan, day, read)) return false;
  const today = isoDay(now);
  const stored = log?.[day];
  return stored ? stored < today : last !== today;
}

/**
 * Qual dia da semana recebe a leitura de `key` quando ela não veio de um dia
 * escolhido: hoje, se o capítulo é de hoje; senão um dia atrasado que tenha
 * esse livro; senão o dia com esse livro cuja ocorrência foi mais recente.
 */
export function creditDayFor(plan: WeekdayPlan | undefined, key: string, now = new Date(), late: number[] = []): number | null {
  if (!plan?.enabled) return null;
  const book = key.split(":")[0];
  const days = ORDER.filter((d) => (plan.days[d] ?? []).includes(book));
  if (!days.length) return null;
  if (days.includes(now.getDay())) return now.getDay();
  const l = days.find((d) => late.includes(d));
  if (l !== undefined) return l;
  return [...days].sort((a, b) => (prevOccurrence(b, now) < prevOccurrence(a, now) ? -1 : 1))[0];
}
