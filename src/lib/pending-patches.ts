/**
 * Keeps edits the user just saved on top of rows that are re-read right after
 * (realtime reloads, cached copies), so a stale answer never puts the old
 * time back on screen. A patch is dropped once a read already shows it or
 * after `ttlMs`.
 */
type Rowish = { id: string };

const same = (a: unknown, b: unknown): boolean => {
  if (typeof a === "string" && typeof b === "string" && /^\d{2}:\d{2}/.test(a) && /^\d{2}:\d{2}/.test(b)) {
    return a.slice(0, 5) === b.slice(0, 5);
  }
  return (a ?? null) === (b ?? null);
};

export function createPendingPatches(ttlMs = 10 * 60_000, now: () => number = Date.now) {
  const map = new Map<string, { patch: Record<string, unknown>; at: number }>();
  return {
    set(id: string, patch: Record<string, unknown>) {
      const prev = map.get(id)?.patch ?? {};
      map.set(id, { patch: { ...prev, ...patch }, at: now() });
    },
    drop(id: string) { map.delete(id); },
    overlay<T extends Rowish>(rows: T[]): T[] {
      return rows.map((r) => {
        const p = map.get(r.id);
        if (!p) return r;
        if (now() - p.at > ttlMs || Object.entries(p.patch).every(([k, v]) => same((r as Record<string, unknown>)[k], v))) {
          map.delete(r.id);
          return r;
        }
        return { ...r, ...p.patch } as T;
      });
    },
  };
}
