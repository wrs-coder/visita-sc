// Relaciona esboços do celular com as cópias da nuvem (mesma conta, outro
// aparelho). Lógica pura, sem rede: usada por Enviar/Receber por esboço e pasta.

export const OUTLINE_PATH_SEPARATOR = " / ";

export interface CloudRowLike {
  id: string;
  title: string;
  folder_path: string | null;
  content_json: unknown;
  deleted_at?: string | null;
}

export function normTitle(s: string | null | undefined): string {
  return (s ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function normPath(s: string | null | undefined): string {
  return (s ?? "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(OUTLINE_PATH_SEPARATOR)
    .toLocaleLowerCase();
}

export function rowNoteType(row: CloudRowLike, fallback = "outline"): string {
  const c = row.content_json;
  if (c && typeof c === "object") {
    const v = (c as Record<string, unknown>).note_type;
    if (typeof v === "string" && v) return v;
  }
  return fallback;
}

function isFolderRow(row: CloudRowLike): boolean {
  const c = row.content_json;
  return !!c && typeof c === "object" && (c as Record<string, unknown>).kind === "folder";
}

/**
 * Procura a cópia da nuvem de um esboço local: primeiro pelo número da
 * nuvem; se não houver, pelo mesmo tipo + pasta + título (só se for única).
 */
export function findCloudMatch(
  note: { cloud_id?: string | null; title?: string | null; type?: string | null },
  path: string,
  rows: CloudRowLike[],
  excludeIds: Set<string> = new Set(),
): CloudRowLike | null {
  const live = rows.filter((r) => !isFolderRow(r) && !r.deleted_at);
  if (note.cloud_id) {
    const byId = live.find((r) => r.id === note.cloud_id);
    if (byId) return byId;
  }
  const t = normTitle(note.title);
  if (!t) return null;
  const p = normPath(path);
  const type = note.type ?? "outline";
  const hits = live.filter(
    (r) => !excludeIds.has(r.id) && normTitle(r.title) === t && normPath(r.folder_path) === p && rowNoteType(r) === type,
  );
  return hits.length === 1 ? hits[0] : null;
}

/** Esboços da nuvem que estão na pasta indicada ou em qualquer subpasta. */
export function rowsInFolderTree(rows: CloudRowLike[], path: string, type: string): CloudRowLike[] {
  const p = normPath(path);
  if (!p) return [];
  return rows.filter((r) => {
    if (isFolderRow(r) || r.deleted_at) return false;
    if (rowNoteType(r) !== type) return false;
    const rp = normPath(r.folder_path);
    return rp === p || rp.startsWith(p + OUTLINE_PATH_SEPARATOR.toLocaleLowerCase());
  });
}
