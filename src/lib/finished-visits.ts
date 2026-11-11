// Visitas já finalizadas neste aparelho. Evita que uma leitura em cache
// (ou um apagamento ainda pendente) faça o aviso "Finalizar agora" voltar.
const KEY = "visitasc.finishedVisits";

export function readFinishedVisits(): Set<string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markVisitFinished(id: string): void {
  try {
    const s = readFinishedVisits();
    s.add(id);
    localStorage.setItem(KEY, JSON.stringify([...s].slice(-200)));
  } catch { /* sem armazenamento: segue só com o estado da tela */ }
}

export function withoutFinished<T extends { id: string }>(rows: T[], finished = readFinishedVisits()): T[] {
  return rows.filter((r) => !finished.has(r.id));
}
