// Recolher/expandir por mês (itinerário). Só aparência, guardado no aparelho.
import { useCallback, useEffect, useState } from "react";

export type OpenMap = Record<string, boolean>;

/** Sem escolha salva: só o mês atual começa aberto. */
export function isMonthOpen(map: OpenMap, key: string, currentKey: string): boolean {
  return key in map ? map[key] : key === currentKey;
}

export const currentMonthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function useOpenMap(storageKey: string) {
  const [map, setMap] = useState<OpenMap>({});
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) setMap(JSON.parse(raw) as OpenMap); } catch { /* */ }
  }, [storageKey]);
  const set = useCallback((key: string, open: boolean) => setMap((m) => {
    const n = { ...m, [key]: open };
    try { localStorage.setItem(storageKey, JSON.stringify(n)); } catch { /* */ }
    return n;
  }), [storageKey]);
  return [map, set] as const;
}
