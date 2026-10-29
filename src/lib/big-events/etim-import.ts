// Leitura de arquivos .etim (JSON com partes "circuitEventPart") de assembleias.
// Arquivo é entrada não confiável: limite de tamanho, validação campo a campo.

export const ETIM_MAX_BYTES = 1024 * 1024;

export type AssignedTo = "speaker" | "co" | "branch" | "none";

export interface EtimPart {
  part_time: string | null;
  duration_min: number | null;
  theme: string;
  outline_number: string | null;
  instructions: string | null;
  part_type_id: string | null;
  part_type_label: string | null;
  symposium: boolean;
  talk_includes: string[];
  assigned_to: AssignedTo;
}

const str = (v: unknown, max = 500): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** Quem faz a parte: SC, filial, ninguém (cântico) ou um orador convidado. */
export function assignedFor(raw: Record<string, unknown>): AssignedTo {
  if (raw.partCOTalk === true || raw.partSharedCO === true) return "co";
  if (raw.partBranchRep === true) return "branch";
  const type = (raw.partType as { id?: unknown } | null)?.id;
  if (type === "Song") return "none";
  return "speaker";
}

export function parseEtim(text: string): EtimPart[] {
  if (text.length > ETIM_MAX_BYTES) throw new Error("Arquivo muito grande (máx. 1 MB).");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("Arquivo .etim inválido."); }
  let list: unknown = data;
  if (!Array.isArray(list) && list && typeof list === "object") {
    const o = list as Record<string, unknown>;
    list = Array.isArray(o.circuitEventPart) ? o.circuitEventPart : Array.isArray(o.parts) ? o.parts : null;
  }
  if (!Array.isArray(list)) throw new Error("Arquivo .etim sem partes.");
  const parts: EtimPart[] = [];
  for (const item of list.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (r.type !== undefined && r.type !== "circuitEventPart") continue;
    const pt = (r.partType && typeof r.partType === "object" ? r.partType : null) as Record<string, unknown> | null;
    const dur = typeof r.partDurationInMinutes === "number" && Number.isFinite(r.partDurationInMinutes)
      ? Math.max(0, Math.min(600, Math.round(r.partDurationInMinutes))) : null;
    const time = str(r.partTime, 5);
    parts.push({
      part_time: time && /^\d{1,2}:\d{2}$/.test(time) ? time : null,
      duration_min: dur,
      theme: str(r.partTheme, 300) ?? str(pt?.label, 120) ?? "",
      outline_number: r.partOutlineNumber == null ? null : String(r.partOutlineNumber).slice(0, 20),
      instructions: str(r.partInstructions, 2000),
      part_type_id: str(pt?.id, 40),
      part_type_label: str(pt?.label, 120),
      symposium: r.symposium === true,
      talk_includes: Array.isArray(r.talkIncludes) ? r.talkIncludes.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
      assigned_to: assignedFor(r),
    });
  }
  if (!parts.length) throw new Error("Nenhuma parte encontrada no arquivo.");
  return parts;
}
