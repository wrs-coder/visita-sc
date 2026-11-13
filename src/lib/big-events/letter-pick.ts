/** Seleção de cartas e regra de troca de orador (lógica pura, sem tela). */
type P = { id: string; assigned_to: string; speaker_name: string | null; status?: string | null; sort_order: number };

/** Partes que recebem carta: só ancião com nome (SC e filial ficam de fora). */
export function letterCandidates<T extends P>(parts: T[]): T[] {
  return parts.filter((p) => p.assigned_to === "speaker" && p.speaker_name?.trim()).sort((a, b) => a.sort_order - b.sort_order);
}

/** Filtra pelas escolhidas; sem escolha = todas. */
export function pickLetterParts<T extends P>(parts: T[], ids?: ReadonlySet<string> | null): T[] {
  const c = letterCandidates(parts);
  return ids ? c.filter((p) => ids.has(p.id)) : c;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

/** Outro orador (não só maiúsculas/espaços) numa parte que já tinha nome. */
export function speakerChanged(before: string | null | undefined, after: string | null | undefined): boolean {
  return !!norm(before) && norm(before) !== norm(after);
}
