// Sessão local de emergência: permite que o app reconheça o usuário quando o
// cofre offline foi aberto (PIN/biometria) mas o servidor está inacessível.
//
// NÃO guarda senha nem tokens aqui — apenas identificação e o retrato de
// perfil já baixado, que também vive em `visita-sc:auth-profile:<uid>`.

const KEY = "visita-sc:offline-session";

export type OfflineSession = {
  userId: string;
  email: string | null;
  at: number;
};

export function saveOfflineSession(userId: string, email: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, email, at: Date.now() } satisfies OfflineSession));
  } catch {
    /* quota */
  }
}

export function readOfflineSession(): OfflineSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineSession;
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOfflineSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
