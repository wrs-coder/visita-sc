// Helper compartilhado para "gate diário" — uma única tarefa por dia local
// do dispositivo. Usado por warmup, sync de outlines e ativação do modo
// offline para evitar downloads redundantes.

export function localDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Verifica se um timestamp armazenado (ms epoch) está no mesmo dia local
 * do dispositivo que "agora".
 */
export function sameLocalDay(ts: number | null | undefined, now: number = Date.now()): boolean {
  if (!ts || ts <= 0) return false;
  return localDayKey(ts) === localDayKey(now);
}

/**
 * Lê um timestamp simples (`localStorage[key]` armazenando ms epoch como string)
 * e retorna true se for do mesmo dia local.
 */
export function isTimestampFreshToday(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return sameLocalDay(ts);
  } catch {
    return false;
  }
}
