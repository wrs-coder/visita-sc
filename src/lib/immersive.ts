// Modo imersivo (tela cheia) nas telas de leitura e escrita do app Android.
// A barra de status do celular some e volta por alguns segundos ao puxar do topo.
// Só presentação: preferência fica no aparelho; no navegador nada acontece.
import { useEffect, useSyncExternalStore } from "react";
import { isCapacitorNative } from "@/lib/platform";

const KEY = "visitasc.immersive.enabled";
const listeners = new Set<() => void>();
let active = 0;

export function isImmersivePrefOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setImmersivePref(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  void apply();
}

export function useImmersivePref(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isImmersivePrefOn,
    () => true,
  );
}

async function apply(): Promise<void> {
  if (typeof window === "undefined" || !isCapacitorNative()) return;
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    if (active > 0 && isImmersivePrefOn()) await StatusBar.hide();
    else await StatusBar.show();
  } catch {
    /* plugin ausente em APKs antigos: ignora */
  }
}

/** Enquanto `on` for verdadeiro, a barra de status do celular fica oculta. */
export function useImmersiveWhile(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    active += 1;
    void apply();
    return () => {
      active -= 1;
      void apply();
    };
  }, [on]);
}
