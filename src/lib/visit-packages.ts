// Pacotes da visita: combinações dos 5 modelos guardadas só neste aparelho.
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
