// Rótulos legíveis (pt) para valores internos que aparecem nas telas.
// Nunca mostrar ao usuário um valor "em código" (ex.: "sick", "grupo_de_campo").

const CATEGORY: Record<string, string> = { inactive: "Inativo", sick: "Doente", special_privileges: "Privilégios especiais" };
const PURPOSE: Record<string, string> = {
  ministerial_servant: "Servo ministerial", elder: "Ancião", redesignation: "Redesignação",
  removal: "Remoção", cca_change: "Mudança de CCA",
};
const MODALITY: Record<string, string> = {
  casa_em_casa: "Casa em casa", estudos_revisitas: "Estudos e revisitas", telefone: "Telefone", cartas: "Cartas",
  telefone_cartas: "Telefone + Cartas", grupo_de_campo: "Grupo de campo", testemunho_publico: "Testemunho público",
  revisitas: "Revisitas", estudos: "Estudos bíblicos",
};

/** "grupo_de_campo" → "Grupo de campo". */
export function humanizeCode(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (!/[_]/.test(s) && !/^[a-z]+$/.test(s)) return s;
  const t = s.replace(/_+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const pick = (m: Record<string, string>) => (v: string | null | undefined) => (v ? m[v] ?? humanizeCode(v) : "");
export const encouragementCategoryLabel = pick(CATEGORY);
export const recommendationPurposeLabel = pick(PURPOSE);
export const modalityLabel = pick(MODALITY);
