// Pauta da reunião com os anciãos: modelo puro (testado). Uma pauta por visita, montada em blocos
// que cada SC renomeia, reordena, oculta, apaga e adiciona. Cada bloco tem quem pode editar.
// Dados de outras telas (reunião com anciãos, recomendações, assuntos locais) entram só na exibição.

export type AgendaRole = "sc" | "coordinator" | "elder";
export type AgendaAccess = "sc" | "coordinator" | "all";
export type AgendaBlockType = "text" | "links" | "recs" | "local";
export type AgendaLinkKind = "book" | "article" | "video";
export interface AgendaLinkItem { id: string; kind: AgendaLinkKind; text: string; urls: string[] }
export interface AgendaBlock {
  id: string; type: AgendaBlockType; title: string; minutes: number; perm: AgendaAccess; hidden: boolean;
  showSubject: boolean; subject: string; html: string; items: AgendaLinkItem[]; notes: Record<string, string>;
}
export interface AgendaPayload {
  v: 2;
  prayerOpen: string; prayerRec: string; prayerClose: string; minutesTaker: string; prayersPerm: AgendaAccess;
  /** Prazo (ISO) para anciãos preencherem; depois disso só o SC edita. */
  deadlineAt: string | null;
  blocks: AgendaBlock[];
}

export const BLOCK_TYPE_LABEL: Record<AgendaBlockType, string> = {
  text: "Texto livre", links: "Links para assistir/ler", recs: "Recomendações de irmãos", local: "Assunto local",
};
export const ACCESS_LABEL: Record<AgendaAccess, string> = { sc: "Só SC", coordinator: "C.Serviço", all: "Todos" };
export const MAX_BLOCKS = 30;

let seq = 0;
export const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newBlock(type: AgendaBlockType, title = BLOCK_TYPE_LABEL[type]): AgendaBlock {
  return { id: newId(), type, title, minutes: type === "text" ? 5 : 10, perm: "all", hidden: false, showSubject: false, subject: "", html: "",
    items: type === "links" ? [{ id: newId(), kind: "book", text: "", urls: [""] }] : [], notes: {} };
}

/** Pauta padrão (igual ao modelo original do SC). */
export function defaultBlocks(): AgendaBlock[] {
  const b = (id: string, type: AgendaBlockType, title: string, minutes: number, perm: AgendaAccess, extra: Partial<AgendaBlock> = {}): AgendaBlock =>
    ({ ...newBlock(type, title), id, minutes, perm, ...extra });
  return [
    b("enc", "text", "Encorajamentos e conselhos", 15, "sc", { showSubject: true }),
    b("reco", "links", "Recomendações para assistir, recapitular e meditar", 0, "sc", {
      items: (["book", "article", "video"] as AgendaLinkKind[]).map((kind) => ({ id: `reco-${kind}`, kind, text: "", urls: [""] })) }),
    b("eldersInfo", "text", "Informações adicionais dos anciãos sobre a necessidade local", 0, "all"),
    b("letters", "text", "Revisão das últimas cartas da filial", 5, "coordinator"),
    b("recs", "recs", "Recomendações para anciãos e servos ministeriais / cancelamentos", 20, "all"),
    b("local", "local", "Assunto local solicitado pelo corpo de anciãos", 10, "all"),
    b("scReading", "text", "Superintendente de Circuito – Recomendação de leitura e meditação", 0, "sc"),
  ];
}

export function emptyAgenda(): AgendaPayload {
  return { v: 2, prayerOpen: "", prayerRec: "", prayerClose: "", minutesTaker: "", prayersPerm: "coordinator", deadlineAt: null, blocks: defaultBlocks() };
}

const str = (v: unknown, max = 200_000) => (typeof v === "string" ? v.slice(0, max) : "");
const mins = (v: unknown, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 240 ? n : d; };
const access = (v: unknown, d: AgendaAccess): AgendaAccess => (v === "sc" || v === "coordinator" || v === "all" ? v : d);
const idOk = (v: unknown) => (typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : newId());

/** Só http(s); qualquer outra coisa vira vazio. */
export function safeUrl(v: unknown): string {
  const s = str(v, 2000).trim();
  if (!s) return "";
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try { const u = new URL(withProto); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : ""; } catch { return ""; }
}
const kindOk = (v: unknown): AgendaLinkKind => (v === "article" || v === "video" ? v : "book");

function normItem(raw: unknown): AgendaLinkItem {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const urls = (Array.isArray(r.urls) ? r.urls : []).slice(0, 10).map((u) => (typeof u === "string" && u.trim() === "" ? "" : safeUrl(u)));
  return { id: idOk(r.id), kind: kindOk(r.kind), text: str(r.text, 500), urls: urls.length ? urls : [""] };
}

export function normalizeBlock(raw: unknown): AgendaBlock {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type: AgendaBlockType = r.type === "links" || r.type === "recs" || r.type === "local" ? r.type : "text";
  const notesIn = r.notes && typeof r.notes === "object" ? (r.notes as Record<string, unknown>) : {};
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(notesIn).slice(0, 50)) if (/^[\w-]{1,64}$/.test(k)) notes[k] = str(v);
  return {
    id: idOk(r.id), type, title: str(r.title, 200).replace(/^\s*\d+[).]\s*/, "") || BLOCK_TYPE_LABEL[type],
    minutes: mins(r.minutes, 0), perm: access(r.perm, "all"), hidden: r.hidden === true,
    showSubject: r.showSubject === true, subject: str(r.subject, 300), html: str(r.html),
    items: type === "links" ? (Array.isArray(r.items) ? r.items : []).slice(0, 30).map(normItem) : [], notes,
  };
}
export const normalizeBlocks = (raw: unknown): AgendaBlock[] => {
  const list = (Array.isArray(raw) ? raw : []).slice(0, MAX_BLOCKS).map(normalizeBlock);
  const seen = new Set<string>();
  return list.map((b) => { if (seen.has(b.id)) b = { ...b, id: newId() }; seen.add(b.id); return b; });
};

/** Converte a pauta do formato antigo (campos fixos) para blocos, sem perder nada. */
function fromLegacy(r: Record<string, unknown>, perms: Record<string, unknown>): AgendaPayload {
  const d = emptyAgenda();
  const p = (g: string, def: AgendaAccess) => access(perms[g], def);
  const links = (Array.isArray(r.links) ? r.links : []) as Array<Record<string, unknown>>;
  const blocks = defaultBlocks().map((b) => {
    switch (b.id) {
      case "enc": return { ...b, subject: str(r.encTheme, 300), minutes: mins(r.encMinutes, 15), perm: p("enc", "sc"), html: str(r.scInfo) };
      case "reco": return { ...b, perm: p("reco", "sc"), html: str(r.reco), items: b.items.map((it, i) => {
        const l = links[i] ?? {}; const u = safeUrl(l.url); return { ...it, text: str(l.label, 500), urls: [u] };
      }) };
      case "eldersInfo": return { ...b, perm: p("eldersInfo", "all"), html: str(r.eldersInfo) };
      case "letters": return { ...b, perm: p("letters", "coordinator"), minutes: mins(r.lettersMinutes, 5), html: str(r.letters) };
      case "recs": return { ...b, perm: p("recs", "all"), minutes: mins(r.recsMinutes, 20), notes: normalizeBlock({ notes: r.recNotes }).notes };
      case "local": return { ...b, perm: p("local", "all"), minutes: mins(r.localMinutes, 10), html: str(r.localNotes) };
      case "scReading": return { ...b, perm: p("scReading", "sc"), html: str(r.scReading) };
      default: return b;
    }
  });
  return { ...d, prayerOpen: str(r.prayerOpen, 120), prayerRec: str(r.prayerRec, 120), prayerClose: str(r.prayerClose, 120),
    minutesTaker: str(r.minutesTaker, 120), prayersPerm: p("prayers", "coordinator"), blocks };
}

function deadline(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function normalizeAgenda(raw: unknown, legacyPerms?: unknown): AgendaPayload {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (r.v !== 2) {
    if (Object.keys(r).length === 0) return emptyAgenda();
    return fromLegacy(r, (legacyPerms && typeof legacyPerms === "object" ? legacyPerms : {}) as Record<string, unknown>);
  }
  return {
    v: 2, prayerOpen: str(r.prayerOpen, 120), prayerRec: str(r.prayerRec, 120), prayerClose: str(r.prayerClose, 120),
    minutesTaker: str(r.minutesTaker, 120), prayersPerm: access(r.prayersPerm, "coordinator"), deadlineAt: deadline(r.deadlineAt),
    blocks: normalizeBlocks(r.blocks),
  };
}

export function canEdit(role: AgendaRole, perm: AgendaAccess): boolean {
  if (role === "sc") return true;
  if (perm === "all") return true;
  return perm === "coordinator" && role === "coordinator";
}
export function isLocked(p: Pick<AgendaPayload, "deadlineAt">, now = Date.now()): boolean {
  return !!p.deadlineAt && Date.parse(p.deadlineAt) <= now;
}
/** Pode editar este bloco agora (prazo encerrado trava todos menos o SC). */
export const canEditNow = (role: AgendaRole, perm: AgendaAccess, p: Pick<AgendaPayload, "deadlineAt">, now = Date.now()) =>
  role === "sc" || (!isLocked(p, now) && canEdit(role, perm));

/**
 * SC grava tudo (estrutura, títulos, ordem, prazo). Os outros só o conteúdo dos blocos que podem editar,
 * e nada depois do prazo. Estrutura (títulos, ordem, minutos, quem edita) é sempre a salva.
 */
export function mergeAgenda(current: AgendaPayload, incoming: AgendaPayload, role: AgendaRole, now = Date.now()): AgendaPayload {
  if (role === "sc") return incoming;
  if (isLocked(current, now)) return current;
  const inc = new Map(incoming.blocks.map((b) => [b.id, b]));
  const out: AgendaPayload = { ...current, blocks: current.blocks.map((b) => {
    const n = inc.get(b.id);
    if (!n || n.type !== b.type || !canEdit(role, b.perm)) return b;
    return { ...b, subject: n.subject, html: n.html, notes: n.notes,
      items: b.type === "links" ? n.items : b.items };
  }) };
  if (canEdit(role, current.prayersPerm)) {
    out.prayerOpen = incoming.prayerOpen; out.prayerRec = incoming.prayerRec; out.prayerClose = incoming.prayerClose; out.minutesTaker = incoming.minutesTaker;
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

export interface NumberedBlock { block: AgendaBlock; n: number; startMin: number }
/** Blocos visíveis numerados pela ordem escolhida, com minuto de início acumulado. */
export function numberedBlocks(blocks: AgendaBlock[]): NumberedBlock[] {
  let acc = 0;
  return blocks.filter((b) => !b.hidden).map((block, i) => { const r = { block, n: i + 1, startMin: acc }; acc += block.minutes; return r; });
}

/** O que aparece na tela/PDF: o digitado vence; vazio cai no que veio do Programa da visita. */
export function agendaView(p: AgendaPayload, a: AgendaAuto) {
  return {
    prayerOpen: p.prayerOpen || a.openingPrayer || "",
    prayerClose: p.prayerClose || a.closingPrayer || "",
    totalMinutes: p.blocks.filter((b) => !b.hidden).reduce((s, b) => s + b.minutes, 0),
  };
}

/** Todas as URLs válidas de uma linha de links. */
export const itemUrls = (it: AgendaLinkItem) => it.urls.map(safeUrl).filter(Boolean);

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

// ---- Modelos de pauta (exportar/importar) ----
export interface AgendaTemplateFile { kind: "visita-sc/agenda-template"; version: 1; name: string; blocks: AgendaBlock[] }
export function templateToFile(name: string, blocks: AgendaBlock[]): AgendaTemplateFile {
  // Modelo leva só a estrutura: conteúdo de visita (anotações por recomendação) fica de fora.
  return { kind: "visita-sc/agenda-template", version: 1, name: name.slice(0, 120), blocks: blocks.map((b) => ({ ...b, notes: {} })) };
}
export function parseTemplateFile(text: string): { name: string; blocks: AgendaBlock[] } | null {
  try {
    const r = JSON.parse(text) as Record<string, unknown>;
    if (r.kind !== "visita-sc/agenda-template" || !Array.isArray(r.blocks)) return null;
    const blocks = normalizeBlocks(r.blocks);
    if (!blocks.length) return null;
    return { name: str(r.name, 120) || "Modelo importado", blocks };
  } catch { return null; }
}

/** Aplica um modelo: estrutura do modelo; o que já foi escrito num bloco de mesmo id/tipo é mantido. */
export function applyTemplate(current: AgendaBlock[], tpl: AgendaBlock[]): AgendaBlock[] {
  const cur = new Map(current.map((b) => [b.id, b]));
  return tpl.map((t) => {
    const c = cur.get(t.id);
    if (!c || c.type !== t.type) return { ...t, notes: {} };
    const hasLinks = c.items.some((it) => it.text || itemUrls(it).length);
    return { ...t, html: c.html || t.html, subject: c.subject || t.subject, notes: c.notes, items: hasLinks ? c.items : t.items };
  });
}
