// Pauta da reunião com os anciãos: modelo puro (testado). Uma pauta por visita;
// cada campo pertence a um grupo e cada grupo tem quem pode editar (SC, coordenador ou todos).
// Dados de outras telas (reunião com anciãos, recomendações, assuntos locais) entram só na exibição.

export type AgendaRole = "sc" | "coordinator" | "elder";
export type AgendaAccess = "sc" | "coordinator" | "all";
export type AgendaGroup = "prayers" | "enc" | "scInfo" | "reco" | "eldersInfo" | "letters" | "recs" | "local" | "scReading";
export type AgendaLinkKind = "book" | "article" | "video";
export interface AgendaLink { kind: AgendaLinkKind; label: string; url: string }

export interface AgendaPayload {
  prayerOpen: string; prayerRec: string; prayerClose: string; minutesTaker: string;
  encTheme: string; encMinutes: number;
  scInfo: string; reco: string; links: AgendaLink[];
  eldersInfo: string;
  letters: string; lettersMinutes: number;
  recsMinutes: number; recNotes: Record<string, string>;
  localMinutes: number; localNotes: string;
  scReading: string;
}
export type AgendaPermissions = Record<AgendaGroup, AgendaAccess>;

export const AGENDA_GROUPS: AgendaGroup[] = ["prayers", "enc", "scInfo", "reco", "eldersInfo", "letters", "recs", "local", "scReading"];
export const AGENDA_GROUP_LABEL: Record<AgendaGroup, string> = {
  prayers: "Orações e ata", enc: "Tema do encorajamento", scInfo: "Informações do SC",
  reco: "Recomendações para assistir, recapitular e meditar", eldersInfo: "Informações dos anciãos sobre a necessidade local",
  letters: "Revisão das cartas da filial", recs: "Recomendações / cancelamentos", local: "Assunto local", scReading: "Recomendação de leitura do SC",
};
export const DEFAULT_PERMISSIONS: AgendaPermissions = {
  prayers: "coordinator", enc: "sc", scInfo: "sc", reco: "sc", eldersInfo: "all",
  letters: "coordinator", recs: "all", local: "all", scReading: "sc",
};
const GROUP_FIELDS: Record<AgendaGroup, Array<keyof AgendaPayload>> = {
  prayers: ["prayerOpen", "prayerRec", "prayerClose", "minutesTaker"],
  enc: ["encTheme", "encMinutes"], scInfo: ["scInfo"], reco: ["reco", "links"], eldersInfo: ["eldersInfo"],
  letters: ["letters", "lettersMinutes"], recs: ["recsMinutes", "recNotes"], local: ["localMinutes", "localNotes"], scReading: ["scReading"],
};

export function emptyAgenda(): AgendaPayload {
  return {
    prayerOpen: "", prayerRec: "", prayerClose: "", minutesTaker: "",
    encTheme: "", encMinutes: 15, scInfo: "", reco: "",
    links: [{ kind: "book", label: "", url: "" }, { kind: "article", label: "", url: "" }, { kind: "video", label: "", url: "" }],
    eldersInfo: "", letters: "", lettersMinutes: 5, recsMinutes: 20, recNotes: {}, localMinutes: 10, localNotes: "", scReading: "",
  };
}

const str = (v: unknown, max = 200_000) => (typeof v === "string" ? v.slice(0, max) : "");
const mins = (v: unknown, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 240 ? n : d; };
/** Só http(s); qualquer outra coisa vira vazio (links de "Clique aqui!"). */
export function safeUrl(v: unknown): string {
  const s = str(v, 2000).trim();
  if (!s) return "";
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try { const u = new URL(withProto); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : ""; } catch { return ""; }
}

export function normalizeAgenda(raw: unknown): AgendaPayload {
  const d = emptyAgenda();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const linksIn = Array.isArray(r.links) ? r.links : [];
  const recIn = r.recNotes && typeof r.recNotes === "object" ? (r.recNotes as Record<string, unknown>) : {};
  const recNotes: Record<string, string> = {};
  for (const [k, v] of Object.entries(recIn).slice(0, 50)) if (/^[\w-]{1,64}$/.test(k)) recNotes[k] = str(v);
  return {
    prayerOpen: str(r.prayerOpen, 120), prayerRec: str(r.prayerRec, 120), prayerClose: str(r.prayerClose, 120), minutesTaker: str(r.minutesTaker, 120),
    encTheme: str(r.encTheme, 300), encMinutes: mins(r.encMinutes, d.encMinutes),
    scInfo: str(r.scInfo), reco: str(r.reco),
    links: d.links.map((def, i) => {
      const l = (linksIn[i] && typeof linksIn[i] === "object" ? linksIn[i] : {}) as Record<string, unknown>;
      return { kind: def.kind, label: str(l.label, 300), url: safeUrl(l.url) };
    }),
    eldersInfo: str(r.eldersInfo), letters: str(r.letters), lettersMinutes: mins(r.lettersMinutes, d.lettersMinutes),
    recsMinutes: mins(r.recsMinutes, d.recsMinutes), recNotes,
    localMinutes: mins(r.localMinutes, d.localMinutes), localNotes: str(r.localNotes), scReading: str(r.scReading),
  };
}

export function normalizePermissions(raw: unknown): AgendaPermissions {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PERMISSIONS };
  for (const g of AGENDA_GROUPS) { const v = r[g]; if (v === "sc" || v === "coordinator" || v === "all") out[g] = v; }
  return out;
}

export function canEdit(role: AgendaRole, access: AgendaAccess): boolean {
  if (role === "sc") return true;
  if (access === "all") return true;
  return access === "coordinator" && role === "coordinator";
}

/** Copia de `incoming` só os grupos que `role` pode editar; o resto fica como está salvo. */
export function mergeAgenda(current: AgendaPayload, incoming: AgendaPayload, role: AgendaRole, perms: AgendaPermissions): AgendaPayload {
  const out: AgendaPayload = { ...current, links: current.links.map((l) => ({ ...l })), recNotes: { ...current.recNotes } };
  for (const g of AGENDA_GROUPS) {
    if (!canEdit(role, perms[g])) continue;
    for (const f of GROUP_FIELDS[g]) (out as unknown as Record<string, unknown>)[f] = incoming[f];
  }
  return out;
}

export interface AgendaAuto {
  meetingAt: string | null; location: string | null; theme: string | null;
  openingPrayer: string | null; closingPrayer: string | null;
  recommendations: Array<{ id: string; title: string; info: string }>;
  local: Array<{ id: string; suggestedBy: string; subject: string; sources: string; info: string }>;
}
export const emptyAuto = (): AgendaAuto => ({ meetingAt: null, location: null, theme: null, openingPrayer: null, closingPrayer: null, recommendations: [], local: [] });

export const RECOMMENDATION_PURPOSE: Record<string, string> = {
  ministerial_servant: "Servo Ministerial", elder: "Ancião", redesignation: "Redesignação", removal: "Cancelamento", cca_change: "Mudança de CCA",
};

/** O que aparece na tela/PDF: o digitado vence; vazio cai no que veio do Programa da visita. */
export function agendaView(p: AgendaPayload, a: AgendaAuto) {
  return {
    prayerOpen: p.prayerOpen || a.openingPrayer || "",
    prayerClose: p.prayerClose || a.closingPrayer || "",
    encTheme: p.encTheme || a.theme || "",
    totalMinutes: p.encMinutes + p.lettersMinutes + p.recsMinutes + p.localMinutes,
  };
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
