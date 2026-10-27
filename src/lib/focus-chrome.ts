// Modo foco: telas de escrita podem ocultar a barra superior do app no celular.
// A barra é só escondida (classe), nunca desmontada, para preservar seu estado.
import { useEffect, useSyncExternalStore } from "react";

let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useFocusChrome(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => active > 0,
    () => false,
  );
}

/** Enquanto `on` for verdadeiro (e o componente montado), a barra do app fica oculta. */
export function useFocusChromeWhile(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    active += 1; emit();
    return () => { active -= 1; emit(); };
  }, [on]);
}
