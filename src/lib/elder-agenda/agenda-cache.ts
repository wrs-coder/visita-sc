// Cópia da pauta no aparelho: abre sem internet com os dados do último carregamento
// (depois do prazo, é a versão fechada que vale na reunião).
import { normalizeAgenda, type AgendaAuto, type AgendaPayload, type AgendaRole } from "./agenda";

export interface CachedAgenda {
  visitId: string; congregation: string; range: string; role: AgendaRole;
  payload: AgendaPayload; auto: AgendaAuto; savedAt: string;
}
const KEY = (scope: string) => `visita-sc:agenda-cache:${scope}`;

export function writeAgendaCache(scope: string, d: Omit<CachedAgenda, "savedAt">) {
  try { localStorage.setItem(KEY(scope), JSON.stringify({ ...d, savedAt: new Date().toISOString() })); } catch { /* sem espaço */ }
}
export function readAgendaCache(scope: string): CachedAgenda | null {
  try {
    const raw = localStorage.getItem(KEY(scope));
    if (!raw) return null;
    const d = JSON.parse(raw) as CachedAgenda;
    return d && d.payload ? { ...d, payload: normalizeAgenda(d.payload) } : null;
  } catch { return null; }
}
/** Apaga a cópia guardada no aparelho (visita finalizada ou sem pauta no servidor). */
export function clearAgendaCache(scope: string) {
  try { localStorage.removeItem(KEY(scope)); } catch (e) { console.error("[agenda-cache] Erro ao apagar cópia:", e); }
}

const STYLE_KEY = "visita-sc:agenda-pdf-style";
export function readPdfStyle(): "formal" | "cards" | "timeline" {
  try { const v = localStorage.getItem(STYLE_KEY); return v === "formal" || v === "cards" ? v : "timeline"; } catch { return "timeline"; }
}
export function writePdfStyle(v: string) { try { localStorage.setItem(STYLE_KEY, v); } catch { /* ignore */ } }
