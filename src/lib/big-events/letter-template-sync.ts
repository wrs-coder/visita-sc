// Sincronização dos modelos de carta (tabela letter_templates). O aparelho salva primeiro;
// o servidor recebe depois. Conflitos: vence o updatedAt mais recente.
import { defaultTemplate, loadTemplates, repairInheritedTemplates, saveTemplates, type LetterTemplate } from "./letter-template";

const migratedKey = (u: string) => `bigEvents.letterTemplates.migrated.${u}`;
const pendingKey = (u: string) => `bigEvents.letterTemplates.pending.${u}`;

export type SyncState = "synced" | "pending" | "local";

interface Pending { removed: string[] }
function loadPending(u: string): Pending | null {
  try {
    const raw = localStorage.getItem(pendingKey(u)); if (!raw) return null;
    const o = JSON.parse(raw);
    return { removed: Array.isArray(o?.removed) ? o.removed.filter((x: unknown) => typeof x === "string") : [] };
  } catch { return null; }
}
export function hasPending(u: string) { return !!loadPending(u); }

/** Junta servidor e aparelho por id; vence o updatedAt mais recente. Ordem do servidor, extras do aparelho no fim. */
export function mergeTemplates(server: LetterTemplate[], local: LetterTemplate[], migrated: boolean): { list: LetterTemplate[]; upload: LetterTemplate[] } {
  const upload: LetterTemplate[] = [];
  const list = server.map((s) => {
    const l = local.find((x) => x.id === s.id);
    if (l && l.updatedAt > s.updatedAt) { upload.push(l); return l; }
    return s;
  });
  if (!migrated || server.length === 0) {
    for (const l of local) if (!server.some((s) => s.id === l.id)) { list.push(l); upload.push(l); }
  }
  return { list: list.length ? list : local, upload };
}

const toRow = (u: string, t: LetterTemplate, i: number) => ({
  superintendent_id: u, id: t.id, name: t.name, data: t as unknown as Record<string, unknown>, sort_order: i, updated_at: t.updatedAt,
});

async function flush(u: string): Promise<boolean> {
  const pending = loadPending(u); if (!pending) return true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const local = loadTemplates(u);
    const { error } = await supabase.from("letter_templates").upsert(local.map((t, i) => toRow(u, t, i)) as never);
    if (error) return false;
    if (pending.removed.length) {
      const { error: e2 } = await supabase.from("letter_templates").delete().in("id", pending.removed);
      if (e2) return false;
    }
    localStorage.removeItem(pendingKey(u));
    return true;
  } catch { return false; }
}

export async function fetchLetterTemplates(u: string): Promise<{ list: LetterTemplate[]; state: SyncState; repaired?: boolean }> {
  const local = loadTemplates(u);
  if (loadPending(u) && !(await flush(u))) return { list: local, state: "pending" };
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.from("letter_templates").select("id,data,sort_order").order("sort_order");
    if (error) return { list: local, state: "local" };
    const base = defaultTemplate();
    const server = (data ?? []).map((r) => ({ ...base, ...(r.data as object), id: r.id }) as LetterTemplate);
    let migrated = false;
    try { migrated = localStorage.getItem(migratedKey(u)) === "1"; } catch { /* */ }
    const merged = mergeTemplates(server, local, migrated);
    const { data: prof } = await supabase.from("profiles").select("full_name,circuit,phone").eq("id", u).maybeSingle();
    const fix = repairInheritedTemplates(merged.list, prof ?? null);
    const list = fix.list, upload = fix.changed ? list : merged.upload;
    if (upload.length) {
      const { error: upErr } = await supabase.from("letter_templates").upsert(list.map((t, i) => toRow(u, t, i)) as never);
      if (upErr) { saveTemplates(u, list); try { localStorage.setItem(pendingKey(u), JSON.stringify({ removed: [] })); } catch { /* */ } return { list, state: "pending", repaired: fix.changed }; }
    }
    try { localStorage.setItem(migratedKey(u), "1"); } catch { /* */ }
    saveTemplates(u, list);
    return { list, state: "synced", repaired: fix.changed };
  } catch { return { list: local, state: "local" }; }
}

/** Grava no aparelho, marca pendente e tenta enviar. */
export async function pushLetterTemplates(u: string, prev: LetterTemplate[], next: LetterTemplate[]): Promise<SyncState> {
  saveTemplates(u, next);
  const removed = new Set([...(loadPending(u)?.removed ?? []), ...prev.filter((p) => !next.some((n) => n.id === p.id)).map((p) => p.id)]);
  for (const n of next) removed.delete(n.id);
  try { localStorage.setItem(pendingKey(u), JSON.stringify({ removed: [...removed] })); } catch { /* */ }
  return (await flush(u)) ? "synced" : "pending";
}

export function startLetterAutoSync(u: string, onDone: (s: SyncState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const run = () => { if (loadPending(u)) void flush(u).then((ok) => onDone(ok ? "synced" : "pending")); };
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}
