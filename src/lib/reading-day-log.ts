/**
 * Registro local (somente no aparelho) do último dia em que cada leitura
 * (pessoal/família) teve um capítulo marcado. Usado no aviso vermelho da
 * meta "Dias" e para não disparar o lembrete de leitura já feita.
 */
import { weekdaySeq, weekdayDayDone, type WeekdayPlan } from "./bible-tracks";

export type ReadTrack = "personal" | "family";
const KEY = (t: ReadTrack) => `bible.readDay.${t}`;

export function isoDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function markReadToday(t: ReadTrack, d = new Date()): void {
  try { localStorage.setItem(KEY(t), isoDay(d)); } catch { /* */ }
}

export function lastReadDay(t: ReadTrack): string | null {
  try { return localStorage.getItem(KEY(t)); } catch { return null; }
}

/** Hoje há leitura programada (meta Dias) e nada foi marcado hoje. */
export function weekdayPending(plan: WeekdayPlan | undefined, read: Set<string>, last: string | null, now = new Date()): boolean {
  if (!plan?.enabled) return false;
  const day = now.getDay();
  if (!weekdaySeq(plan, day).length || weekdayDayDone(plan, day, read)) return false;
  return last !== isoDay(now);
}
