// Pacotes da visita: combinações dos 5 modelos, salvas no servidor com cópia no aparelho.
export interface VisitPackage {
  id: string;
  name: string;
  template_id: string;
  checklist_template_id: string;
  field_template_id: string;
  meeting_talk_template_id: string;
  elder_program_template_id: string;
}

export const PACKAGE_FIELDS = [
  "template_id",
  "checklist_template_id",
  "field_template_id",
  "meeting_talk_template_id",
  "elder_program_template_id",
] as const;
export type PackageField = (typeof PACKAGE_FIELDS)[number];

const key = (userId: string | null | undefined) => `visita-sc:visit-packages:${userId ?? "anon"}`;

export function loadPackages(userId: string | null | undefined): VisitPackage[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(isPackage) : [];
  } catch {
    return [];
  }
}

export function savePackages(userId: string | null | undefined, list: VisitPackage[]) {
  try { localStorage.setItem(key(userId), JSON.stringify(list)); } catch { /* quota */ }
}

export function isPackage(x: unknown): x is VisitPackage {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && PACKAGE_FIELDS.every((f) => typeof o[f] === "string");
}

/** Campos do pacote cujo modelo não existe mais (ou está vazio). */
export function missingFields(pkg: VisitPackage, available: Record<PackageField, string[]>): PackageField[] {
  return PACKAGE_FIELDS.filter((f) => !pkg[f] || !available[f].includes(pkg[f]));
}

/** Valores a aplicar no formulário da visita: só os modelos que ainda existem. */
export function packageToForm(pkg: VisitPackage, available: Record<PackageField, string[]>): Partial<Record<PackageField, string>> {
  const out: Partial<Record<PackageField, string>> = {};
  for (const f of PACKAGE_FIELDS) if (pkg[f] && available[f].includes(pkg[f])) out[f] = pkg[f];
  return out;
}

// ---- Sincronização com o servidor (tabela visit_packages; localStorage vira cache) ----
const migratedKey = (userId: string) => `visit-packages:migrated:${userId}`;

/** Decide a lista inicial: na 1ª vez, se o servidor está vazio, sobe os pacotes do aparelho. */
export function decideInitialSync(server: VisitPackage[], local: VisitPackage[], migrated: boolean) {
  if (!migrated && server.length === 0 && local.length > 0) return { list: local, upload: local };
  if (!migrated && local.length > 0) {
    const extra = local.filter((l) => !server.some((s) => s.id === l.id));
    return { list: [...server, ...extra], upload: extra };
  }
  return { list: server, upload: [] as VisitPackage[] };
}

const toRow = (userId: string, p: VisitPackage) => ({
  id: p.id, superintendent_id: userId, name: p.name,
  template_id: p.template_id, checklist_template_id: p.checklist_template_id, field_template_id: p.field_template_id,
  meeting_talk_template_id: p.meeting_talk_template_id, elder_program_template_id: p.elder_program_template_id,
});

export async function fetchPackages(userId: string | null | undefined): Promise<VisitPackage[]> {
  const local = loadPackages(userId);
  if (!userId) return local;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.from("visit_packages").select("*").order("created_at");
    if (error) return local;
    const server = (data ?? []).map((r) => ({
      id: r.id, name: r.name, template_id: r.template_id, checklist_template_id: r.checklist_template_id,
      field_template_id: r.field_template_id, meeting_talk_template_id: r.meeting_talk_template_id,
      elder_program_template_id: r.elder_program_template_id,
    }));
    let migrated = false;
    try { migrated = localStorage.getItem(migratedKey(userId)) === "1"; } catch { /* ignore */ }
    const { list, upload } = decideInitialSync(server, local, migrated);
    if (upload.length) {
      const { error: upErr } = await supabase.from("visit_packages").upsert(upload.map((p) => toRow(userId, p)));
      if (upErr) return local;
    }
    try { localStorage.setItem(migratedKey(userId), "1"); } catch { /* ignore */ }
    savePackages(userId, list);
    return list;
  } catch {
    return local;
  }
}

/** Grava no aparelho e envia ao servidor (upsert dos atuais + remoção dos excluídos). */
export async function pushPackages(userId: string | null | undefined, prev: VisitPackage[], next: VisitPackage[]): Promise<boolean> {
  savePackages(userId, next);
  if (!userId) return false;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    if (next.length) {
      const { error } = await supabase.from("visit_packages").upsert(next.map((p) => toRow(userId, p)));
      if (error) return false;
    }
    const removed = prev.filter((p) => !next.some((n) => n.id === p.id)).map((p) => p.id);
    if (removed.length) {
      const { error } = await supabase.from("visit_packages").delete().in("id", removed);
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}
