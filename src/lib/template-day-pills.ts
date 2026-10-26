// Dias dos modelos: 0=Ter (1º dia) … 5=Dom, 6=Seg (dia extra, opcional).
export const MONDAY_OFFSET = 6;
export const TUESDAY_OFFSET = 0;
export const BASE_DAYS = [1, 2, 3, 4, 5];

/** Terça e Segunda são opcionais: aparecem se o usuário ligou a chave ou se o modelo já tem itens nelas. */
export function visibleTemplateDays(
  showMonday: boolean,
  hasMondayItems: boolean,
  showTuesday = false,
  hasTuesdayItems = false,
): number[] {
  const days = [...BASE_DAYS];
  if (showTuesday || hasTuesdayItems) days.unshift(TUESDAY_OFFSET);
  if (showMonday || hasMondayItems) days.push(MONDAY_OFFSET);
  return days;
}

/** Mantém o dia escolhido válido quando a Segunda some. */
export function clampActiveDay(day: number, days: number[]): number {
  return days.includes(day) ? day : days[0];
}

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
