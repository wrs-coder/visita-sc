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

/**
 * Dias de leitura programada (meta "Dias") que passaram sem leitura desde a
 * última leitura marcada, sem contar hoje. 0 = não está atrasada.
 * Sem registro neste aparelho (ex.: celular novo), olha os últimos 7 dias:
 * conta os dias programados que ainda têm capítulo não lido. Só quando
 * `read` é informado; marcar um capítulo grava o registro e volta ao normal.
 */
export function overdueDays(plan: WeekdayPlan | undefined, last: string | null, now = new Date(), read?: Set<string>): number {
  if (!plan?.enabled) return 0;
  if (!last) {
    if (!read) return 0;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let n = 0;
    for (let i = 0; i < 7; i++) {
      d.setDate(d.getDate() - 1);
      const day = d.getDay();
      if (weekdaySeq(plan, day).length && !weekdayDayDone(plan, day, read)) n++;
    }
    return n;
  }
  const today = isoDay(now);
  if (last >= today) return 0;
  let n = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < 366; i++) {
    d.setDate(d.getDate() - 1);
    if (isoDay(d) <= last) break;
    if (weekdaySeq(plan, d.getDay()).length) n++;
  }
  return n;
}
