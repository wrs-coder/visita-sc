/**
 * Atraso da leitura pessoal/família (meta "Dias"), individual por dia da semana.
 *
 * As datas ficam DENTRO do próprio plano (WeekdayPlan.lastRead / since), então
 * vão junto no backup e na troca de celular:
 * - `lastRead[d]` (0=dom..6=sáb): data da ocorrência daquele dia já lida.
 * - `since`: dia em que a contagem começou. Funciona como "piso": um dia sem
 *   data própria nunca fica atrasado de surpresa; ele só acende depois que uma
 *   ocorrência dele passa, a partir de `since`, sem leitura.
 *
 * Regra: o domingo só fica atrasado depois que um domingo programado passa sem
 * leitura daquele domingo. Ler o domingo atrasado durante a semana tira o
 * atraso. A leitura de um dia nunca mexe no atraso de outro dia.
 *
 * `bible.readDay.<track>` (aparelho) continua só para os lembretes, e
 * `bible.readDay.<track>.byWeekday` (versão anterior) só é lido uma vez para
 * semear o plano.
 */
import { weekdaySeq, weekdayDayDone, type WeekdayPlan } from "./bible-tracks";

export type ReadTrack = "personal" | "family";
/** 7 posições (0=dom..6=sáb): data (AAAA-MM-DD) da ocorrência já lida. */
export type WeekdayLog = (string | null)[];

const KEY = (t: ReadTrack) => `bible.readDay.${t}`;
const WKEY = (t: ReadTrack) => `bible.readDay.${t}.byWeekday`;
/** Ordem de exibição: segunda → domingo. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fromIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const maxIso = (a: string | null | undefined, b: string | null | undefined): string | null => (!a ? b ?? null : !b ? a : a > b ? a : b);
const emptyLog = (): WeekdayLog => Array(7).fill(null);

/** Último dia em que algo foi lido neste aparelho (usado pelos lembretes). */
export function markReadToday(t: ReadTrack, d = new Date()): void {
  try { localStorage.setItem(KEY(t), isoDay(d)); } catch { /* */ }
}
export function lastReadDay(t: ReadTrack): string | null {
  try { return localStorage.getItem(KEY(t)); } catch { return null; }
}

/** Registro por dia gravado no aparelho pela versão anterior (só para semear). */
export function weekdayLog(t: ReadTrack): WeekdayLog {
  try {
    const raw = JSON.parse(localStorage.getItem(WKEY(t)) ?? "null");
    if (Array.isArray(raw)) return Array.from({ length: 7 }, (_, i) => (typeof raw[i] === "string" && ISO.test(raw[i]) ? raw[i] : null));
  } catch { /* */ }
  return emptyLog();
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

/** Data considerada lida para o dia `day`: a própria ou o piso de `since`. */
export function effectiveRead(plan: WeekdayPlan, day: number): string | null {
  const floor = plan.since ? isoDay(addDays(fromIso(plan.since), -1)) : null;
  return maxIso(plan.lastRead?.[day], floor);
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

/** Plano com a leitura do dia `day` registrada hoje (só aquele dia muda). */
export function creditPlan(plan: WeekdayPlan, day: number, now = new Date()): WeekdayPlan {
  const lastRead = plan.lastRead ? [...plan.lastRead] : emptyLog();
  const slot = slotFor(day, effectiveRead(plan, day), now);
  if (!lastRead[day] || lastRead[day]! < slot) lastRead[day] = slot;
  return { ...plan, lastRead, since: plan.since ?? isoDay(now) };
}

/**
 * Começa a contagem num plano que ainda não tem `since` (plano antigo ou
 * backup de versão anterior): hoje vira o piso e as datas por dia que este
 * aparelho já tinha são aproveitadas. Nenhum dia fica atrasado de surpresa.
 */
export function seedPlan(plan: WeekdayPlan, deviceLog: WeekdayLog = emptyLog(), now = new Date()): WeekdayPlan {
  if (plan.since) return plan;
  const lastRead = Array.from({ length: 7 }, (_, i) => maxIso(plan.lastRead?.[i], deviceLog[i]));
  return { ...plan, lastRead, since: isoDay(now) };
}

/**
 * Edição do plano (livros dos dias, ligar a meta): as datas de controle vêm
 * sempre do plano salvo. Ligar a meta recomeça a contagem hoje; um dia que
 * passa a ter livro começa em dia (só acende quando a próxima ocorrência passar).
 */
export function planEdited(prev: WeekdayPlan | undefined, next: WeekdayPlan, now = new Date()): WeekdayPlan {
  if (!next.enabled) return { ...next, lastRead: prev?.lastRead ?? next.lastRead, since: prev?.since ?? next.since };
  if (!prev?.enabled) return { ...next, lastRead: emptyLog(), since: isoDay(now) };
  const lastRead = prev.lastRead ? [...prev.lastRead] : emptyLog();
  for (let d = 0; d < 7; d++) {
    if (!weekdaySeq(prev, d).length && weekdaySeq(next, d).length) lastRead[d] = maxIso(lastRead[d], prevOccurrence(d, now));
  }
  return { ...next, lastRead, since: prev.since ?? isoDay(now) };
}

/**
 * Dias da semana (ordem seg→dom) com leitura atrasada. Um dia programado e
 * ainda não concluído fica atrasado quando a última ocorrência dele (antes de
 * hoje) não foi lida. Sem `since` e sem data própria, nunca acusa atraso.
 */
export function lateWeekdays(plan: WeekdayPlan | undefined, now = new Date(), read: Set<string> = new Set()): number[] {
  if (!plan?.enabled) return [];
  const out: number[] = [];
  for (const d of ORDER) {
    if (!weekdaySeq(plan, d).length || weekdayDayDone(plan, d, read)) continue;
    const stored = effectiveRead(plan, d);
    if (stored && stored < prevOccurrence(d, now)) out.push(d);
  }
  return out;
}

/** Quantidade de dias da semana com leitura atrasada. 0 = em dia. */
export function overdueDays(plan: WeekdayPlan | undefined, now = new Date(), read?: Set<string>): number {
  return lateWeekdays(plan, now, read).length;
}

/** Hoje há leitura programada (meta Dias) e a leitura de hoje não foi marcada. */
export function weekdayPending(plan: WeekdayPlan | undefined, read: Set<string>, now = new Date()): boolean {
  if (!plan?.enabled) return false;
  const day = now.getDay();
  if (!weekdaySeq(plan, day).length || weekdayDayDone(plan, day, read)) return false;
  const stored = plan.lastRead?.[day];
  return !stored || stored < isoDay(now);
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
