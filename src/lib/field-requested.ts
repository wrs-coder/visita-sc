// Itens opcionais do Campo que o superintendente pede aos anciãos.
// null/undefined = linha antiga: mantém a regra antiga (território só em
// casa em casa / grupo; oração final sempre). O superintendente vê tudo.
export type FieldKey = "territory_number" | "territory_location" | "auxiliary_leaders" | "closing_prayer";
export const FIELD_KEYS: FieldKey[] = ["territory_number", "territory_location", "auxiliary_leaders", "closing_prayer"];

type RowLike = { modality?: string | null; requested_fields?: string[] | null } & Partial<Record<FieldKey | "meeting_location", string | null>>;

export function fieldVisible(r: RowLike, f: FieldKey, isSuper: boolean): boolean {
  if (isSuper) return true;
  if (!Array.isArray(r.requested_fields)) {
    if (f === "closing_prayer") return true;
    return r.modality === "casa_em_casa" || r.modality === "grupo_de_campo";
  }
  return r.requested_fields.includes(f);
}

/** Campos que os anciãos ainda precisam preencher (local + itens pedidos). */
export function missingFieldCount(rows: RowLike[]): number {
  let n = 0;
  for (const r of rows) {
    if (!(r.meeting_location ?? "").trim()) n++;
    for (const f of FIELD_KEYS) if (fieldVisible(r, f, false) && !(r[f] ?? "").trim()) n++;
  }
  return n;
}
