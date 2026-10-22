// Entrada por código de acesso compartilhada pelas telas de login.
// Guarda o retrato recebido para o painel abrir sem nova consulta e
// permite entrar sem internet quando o aparelho já tem os dados daquele código.
import { saveGuestSession, setSelectedCongregation } from "./guest-session";
import { loadSnapshot, saveSnapshot } from "./snapshot-cache";

export function hasLocalGuestData(code: string): boolean {
  if (loadSnapshot("guest", code)) return true;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`visita-sc:snap:guest:${code}:`)) return true;
    }
  } catch { /* noop */ }
  return false;
}

type Fetch = (args: { data: { inviteCode: string; pickCurrent?: boolean } }) => Promise<unknown>;

/** Retorna "ok", "invalid" (servidor recusou) ou "network" (sem rede e sem dados locais). */
export async function guestLogin(code: string, fetchSnap: Fetch): Promise<"ok" | "invalid" | "network"> {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      const r = (await fetchSnap({ data: { inviteCode: code, pickCurrent: true } })) as {
        ok: boolean; selectedCongregationId?: string | null;
      };
      if (!r.ok) return "invalid";
      saveGuestSession(code);
      if (r.selectedCongregationId) {
        setSelectedCongregation(r.selectedCongregationId);
        saveSnapshot("guest", `${code}:${r.selectedCongregationId}`, r);
      }
      saveSnapshot("guest", code, r);
      return "ok";
    } catch { /* cai para os dados locais */ }
  }
  if (hasLocalGuestData(code)) {
    saveGuestSession(code);
    return "ok";
  }
  return "network";
}
