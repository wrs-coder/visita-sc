// Confere no próprio aparelho se quem está usando é o superintendente,
// sem perguntar ao servidor (as telas abrem sem internet).
import { readStoredSession } from "@/lib/auth-attach-safe";
import { readOfflineSession } from "@/lib/offline-session";

/** true/false quando sabe; null quando o aparelho ainda não tem o retrato. */
export function isSuperintendentLocally(): boolean | null {
  if (typeof window === "undefined") return null;
  const uid = readStoredSession()?.user?.id ?? readOfflineSession()?.userId ?? null;
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`visita-sc:auth-profile:${uid}`);
    if (!raw) return null;
    const snap = JSON.parse(raw) as { role?: string | null };
    if (!snap.role) return null;
    return snap.role === "superintendent";
  } catch {
    return null;
  }
}
