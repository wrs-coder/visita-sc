// Esboços recentes por subaba — só no aparelho (localStorage).
export const RECENT_LIMIT = 5;
const key = (type: string) => `personal-outlines.recent.${type}`;

export function pushRecentId(list: string[], id: string): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
}

export function readRecent(type: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(type)) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function touchRecent(type: string, id: string): string[] {
  const next = pushRecentId(readRecent(type), id);
  try { localStorage.setItem(key(type), JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
