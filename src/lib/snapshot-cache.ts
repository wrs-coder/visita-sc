// Cache local (localStorage) para snapshots retornados por server functions
// que NÃO usam React Query. Permite que telas como "Resumo da Semana" e o
// painel do visitante (corpo de anciãos / ESC) continuem exibindo o conteúdo
// quando o usuário estiver offline ou o servidor falhar.
//
// 100% client-side. Apenas leitura/escrita de JSON simples. Falhas silenciosas
// (cota cheia, JSON inválido, SSR) nunca derrubam a UI.

const PREFIX = "visita-sc:snap:";

function key(scope: string, id: string) {
  return `${PREFIX}${scope}:${id}`;
}

export function saveSnapshot<T>(scope: string, id: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      key(scope, id),
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* quota / serialização */
  }
}

export function loadSnapshot<T>(scope: string, id: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function snapshotSavedAt(scope: string, id: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number };
    return parsed?.at ?? null;
  } catch {
    return null;
  }
}
