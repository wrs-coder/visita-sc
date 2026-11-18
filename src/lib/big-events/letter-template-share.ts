// Partilhar Modelos de cartas com outros SCs: o arquivo nunca leva o Timbre
// (cabeçalho com nome, circuito, endereço, telefone) nem a Assinatura.
import { defaultTemplate, sanitizeLayout, type LetterTemplate } from "./letter-template";

export const LETTER_SHARE_KIND = "visitasc-letter-templates";
const PERSONAL = ["headerTitle", "headerSubtitle", "headerAddress", "headerPhone", "signature"] as const;
const TEXT_KEYS = ["name", "refLine", "salutation", "opening", "remindersTitle", "highlight", "reminders", "rehearsal", "rehearsalNote", "closing", "signoff"] as const;
const MAX_TEMPLATES = 50;
export const MAX_SHARE_FILE_BYTES = 1_000_000;

export type SharedTemplate = Omit<LetterTemplate, "id" | "updatedAt" | (typeof PERSONAL)[number]>;
export interface LetterShareFile { kind: typeof LETTER_SHARE_KIND; version: 1; exportedAt: string; templates: SharedTemplate[] }

export function buildLetterShareFile(list: LetterTemplate[], now = new Date()): LetterShareFile {
  const templates = list.map((t) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, updatedAt, headerTitle, headerSubtitle, headerAddress, headerPhone, signature, ...rest } = t;
    return rest;
  });
  return { kind: LETTER_SHARE_KIND, version: 1, exportedAt: now.toISOString(), templates };
}

/**
 * Lê o arquivo e devolve modelos novos (ids novos). Timbre e Assinatura vêm
 * do modelo padrão do próprio usuário; nome repetido ganha "(importado)".
 */
export function parseLetterShareFile(raw: unknown, mine: LetterTemplate[], now = new Date()): LetterTemplate[] {
  const f = raw as Partial<LetterShareFile> | null;
  if (!f || f.kind !== LETTER_SHARE_KIND || !Array.isArray(f.templates)) throw new Error("Este arquivo não é de Modelos de cartas.");
  const base = defaultTemplate();
  const own = mine[0];
  const names = new Set(mine.map((t) => t.name));
  return f.templates.slice(0, MAX_TEMPLATES).map((src) => {
    const s = (src ?? {}) as Record<string, unknown>;
    const t: LetterTemplate = { ...base, id: crypto.randomUUID(), updatedAt: now.toISOString() };
    for (const k of TEXT_KEYS) if (typeof s[k] === "string") (t as unknown as Record<string, string>)[k] = (s[k] as string).slice(0, 4000);
    t.name = (t.name || "Modelo").slice(0, 80);
    if (s.headerStyle === "classic" || s.headerStyle === "formal" || s.headerStyle === "institutional") t.headerStyle = s.headerStyle;
    if (s.colors && typeof s.colors === "object") t.colors = s.colors as LetterTemplate["colors"];
    const layout = sanitizeLayout(s.layout); if (layout) t.layout = layout;
    if (s.boxes && typeof s.boxes === "object") t.boxes = s.boxes as LetterTemplate["boxes"];
    for (const k of PERSONAL) t[k] = own ? own[k] : "";
    if (names.has(t.name)) t.name = `${t.name} (importado)`.slice(0, 80);
    names.add(t.name);
    return t;
  });
}
