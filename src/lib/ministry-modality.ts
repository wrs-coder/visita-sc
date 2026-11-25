/**
 * Companhia (Ministério): modalidade do pedido de companhia.
 * Valor guardado: chave fixa ou "outro:<texto>". Vazio/null = "Estudos e Revisitas"
 * (itens antigos continuam iguais).
 */
export const MINISTRY_MODALITIES = [
  { value: "estudos", label: "Estudos" },
  { value: "revisitas", label: "Revisitas" },
  { value: "estudos_revisitas", label: "Estudos e Revisitas" },
  { value: "carrinho", label: "Testemunho com Carrinho" },
  { value: "casa_em_casa", label: "Pregação de casa em casa" },
  { value: "outro", label: "Outro" },
] as const;

export const DEFAULT_MINISTRY_MODALITY = "estudos_revisitas";

/** Separa o valor guardado em chave do menu + texto livre de "Outro". */
export function splitMinistryModality(v: string | null | undefined): { key: string; other: string } {
  const s = (v ?? "").trim();
  if (!s) return { key: DEFAULT_MINISTRY_MODALITY, other: "" };
  if (s.startsWith("outro:")) return { key: "outro", other: s.slice(6) };
  if (s === "outro") return { key: "outro", other: "" };
  if (MINISTRY_MODALITIES.some((m) => m.value === s)) return { key: s, other: "" };
  return { key: "outro", other: s };
}

/** Junta chave + texto; "Outro" sem texto volta ao padrão para não gravar vazio. */
export function joinMinistryModality(key: string, other: string): string {
  if (key === "outro") {
    const t = other.trim();
    return t ? `outro:${t}` : DEFAULT_MINISTRY_MODALITY;
  }
  return MINISTRY_MODALITIES.some((m) => m.value === key) ? key : DEFAULT_MINISTRY_MODALITY;
}

export function ministryModalityLabel(v: string | null | undefined): string {
  const { key, other } = splitMinistryModality(v);
  if (key === "outro") return other || "Outro";
  return MINISTRY_MODALITIES.find((m) => m.value === key)?.label ?? "Estudos e Revisitas";
}

/* ---- Sugestão: lembrar no aparelho os textos digitados em "Outro" ---- */
const MAX_REMEMBERED = 8;
function storeKey(scope: string) { return `other-modality.${scope}`; }

export function rememberedOthers(scope: string): string[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(storeKey(scope)) : null;
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

export function pushRemembered(list: string[], text: string): string[] {
  const t = text.trim();
  if (!t) return list;
  const rest = list.filter((x) => x.toLowerCase() !== t.toLowerCase());
  return [t, ...rest].slice(0, MAX_REMEMBERED);
}

export function rememberOther(scope: string, text: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(storeKey(scope), JSON.stringify(pushRemembered(rememberedOthers(scope), text)));
  } catch { /* sem espaço: ignora */ }
}
