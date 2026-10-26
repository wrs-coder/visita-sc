/** Dia inicial das pílulas: hoje se estiver na visita, senão o 1º dia. */
export function pickInitialVisitDay(keys: string[], todayKey: string | null): string {
  if (todayKey && keys.includes(todayKey)) return todayKey;
  return keys[0] ?? "";
}
