// Limite de PINs errados por evento (link único compartilhado por todos os oradores).
export const MAX_EVENT_FAILS = 20;
export const LOCK_MS = 15 * 60_000;
export const MAX_DEVICE_FAILS = 10;

export function isLocked(lockedUntil: string | null, now = Date.now()): boolean {
  return !!lockedUntil && new Date(lockedUntil).getTime() > now;
}

export function nextAttemptState(cur: { failed_attempts: number; locked_until: string | null }, success: boolean, now = Date.now()) {
  if (success) return { failed_attempts: 0, locked_until: null as string | null };
  const fails = cur.failed_attempts + 1;
  if (fails >= MAX_EVENT_FAILS) return { failed_attempts: 0, locked_until: new Date(now + LOCK_MS).toISOString() };
  return { failed_attempts: fails, locked_until: cur.locked_until };
}
