// Pauta da reunião com os anciãos: modelo puro (testado). Uma pauta por visita, montada em TÓPICOS
// (título numerado + minutos) e, dentro de cada tópico, CARTÕES de estilos à escolha do SC.
// Cada cartão tem quem pode editar. Dados de outras telas (recomendações, assuntos locais) entram só na exibição.

export type AgendaRole = "sc" | "coordinator" | "elder";
export type AgendaAccess = "sc" | "coordinator" | "all";
export type AgendaCardType = "notes" | "links" | "eldersInfo" | "scReply" | "recs" | "local" | "private";
export type AgendaLinkKind = "book" | "article" | "video";
export interface AgendaLinkPart { id: string; title: string; url: string }
/** Cada parte é uma publicação/vídeo com seu próprio link; text/urls ficam sincronizados por compatibilidade. */
export interface AgendaLinkItem { id: string; kind: AgendaLinkKind; text: string; urls: string[]; parts: AgendaLinkPart[] }
export interface AgendaRecInfo { family: string; fieldGroup: string; info: string }
export type AgendaAttachmentKind = "photo" | "pdf" | "link";
export interface AgendaAttachment {
  id: string; kind: AgendaAttachmentKind; title: string;
  /** Só para kind "link". */ url: string;
  /** Arquivo enviado à nuvem (caminho no depósito privado); vazio = só no aparelho do SC. */ cloudPath: string;
  size: number;
}
export interface AgendaCard {
  id: string; type: AgendaCardType; perm: AgendaAccess;
  showSubject: boolean; subject: string; html: string; items: AgendaLinkItem[];
  /** Informação partilhada pelo CA, por recomendação (cartão recs). */ notes: Record<string, string>;
  /** Membros da família / grupo / informações editados na pauta, por recomendação (cartão recs). */ recInfo: Record<string, AgendaRecInfo>;
  attachments: AgendaAttachment[];
  /** Oculto dos anciãos: só o SC vê; nunca sai do servidor para outros nem vai ao PDF. */ hidden: boolean;
  /** Só no cartão eldersInfo: perguntas de marcar e perguntas com resposta, montadas pelo SC. */
  checklist: AgendaQuestion[]; questions: AgendaQuestion[];
  /** Só no cartão eldersInfo: uma resposta por ancião (cada aparelho só altera a sua). */
  responses: AgendaElderResponse[];
}
export interface AgendaQuestion { id: string; text: string }
/** Resposta de um item do checklist; item sem resposta fica fora do mapa. */
export type AgendaCheckAnswer = "yes" | "no" | "partial";
export const CHECK_ANSWERS: AgendaCheckAnswer[] = ["yes", "no", "partial"];
export const CHECK_ANSWER_LABEL: Record<AgendaCheckAnswer, string> = { yes: "Sim", no: "Não", partial: "Em parte" };
export interface AgendaElderResponse {
  id: string;
  /** SHA-256 do segredo do aparelho que escreveu; vazio = só o SC altera (ex.: texto antigo). */ authorKey: string;
  /** Opcional: sem nome aparece como "Ancião N". */ name: string;
  /** Antigo formato de marcar (true) é lido como "Sim". */ checks: Record<string, AgendaCheckAnswer>; answers: Record<string, string>; html: string; updatedAt: string;
}
export type AgendaRecDecision = "assign" | "decline" | null;
/** Comentário e decisão do SC por recomendação: só do SC, nunca chega aos anciãos nem ao PDF. */
export interface AgendaScRec { comment: string; decision: AgendaRecDecision }
export const DEFAULT_AGENDA_TITLE = "Pauta – Reunião com Anciãos";
export const DEFAULT_AGENDA_VERSES = "Isa 50:4; Pro 18:13,17; Tia 1:19; 1 Cor 4:6; 2 Cor 1:24; Col 2:8; Mat 5:41; Tito 1:5";
export type AgendaPdfStyleId = "formal" | "cards" | "timeline";
export const agendaPdfStyleOf = (v: unknown): AgendaPdfStyleId => (v === "formal" || v === "cards" || v === "timeline" ? v : "timeline");
export interface AgendaBlock { id: string; title: string; minutes: number; hidden: boolean; cards: AgendaCard[] }
export interface AgendaPayload {
  v: 3;
  prayerOpen: string; prayerRec: string; prayerClose: string; minutesTaker: string; prayersPerm: AgendaAccess;
  /** Prazo (ISO) para anciãos preencherem; depois disso só o SC edita. */
  deadlineAt: string | null;
  blocks: AgendaBlock[];
  /** Interruptores opcionais do cabeçalho (inicial e final são fixas). */
  showPrayerRec: boolean; showMinutes: boolean;
  headerTitle: string; headerVerses: string;
  /** Modelo de PDF escolhido pelo SC; os anciãos sempre exportam neste. */
  pdfStyle: AgendaPdfStyleId;
  scRecs: Record<string, AgendaScRec>;
}

/** Um único nome por estilo: usado na lista de escolha, no editor e no PDF. */
export const CARD_TYPE_LABEL: Record<AgendaCardType, string> = {
  notes: "Informações do SC", links: "Fontes de matéria", eldersInfo: "Informações adicionais dos anciãos", scReply: "Resposta do SC",
  recs: "Recomendações de irmãos", local: "Assunto local", private: "Nota privada do SC",
};
export const CARD_TYPES: AgendaCardType[] = ["notes", "links", "eldersInfo", "scReply", "recs", "local", "private"];
export const ATTACHABLE: AgendaCardType[] = ["notes", "eldersInfo", "scReply", "private"];
export const ACCESS_LABEL: Record<AgendaAccess, string> = { sc: "Só SC", coordinator: "C.Serviço", all: "Todos" };
export const MAX_BLOCKS = 30;
export const MAX_CARDS = 12;
export const MAX_CLOUD_ATTACHMENTS = 5;
export const MAX_RESPONSES = 30;
export const MAX_QUESTIONS = 20;
export const MAX_CLOUD_BYTES = 5 * 1024 * 1024;

let seq = 0;
export const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_PERM: Record<AgendaCardType, AgendaAccess> = {
  notes: "sc", links: "sc", eldersInfo: "all", scReply: "sc", recs: "all", local: "all", private: "sc",
};
export function newCard(type: AgendaCardType, extra: Partial<AgendaCard> = {}): AgendaCard {
  return { id: newId(), type, perm: DEFAULT_PERM[type], showSubject: false, subject: "", html: "",
    items: type === "links" ? [newLinkItem("book")] : [], notes: {}, recInfo: {}, attachments: [], hidden: false, checklist: [], questions: [], responses: [], ...extra };
}
export function newBlock(title = "Novo tópico", cards: AgendaCard[] = [newCard("notes")]): AgendaBlock {
  return { id: newId(), title, minutes: 5, hidden: false, cards };
}

/** Pauta padrão (igual ao modelo original do SC). */
export function defaultBlocks(): AgendaBlock[] {
  const t = (id: string, title: string, minutes: number, cards: AgendaCard[]): AgendaBlock => ({ id, title, minutes, hidden: false, cards });
  return [
    t("enc", "Encorajamentos e conselhos", 15, [
      newCard("notes", { id: "enc", showSubject: true }),
      newCard("links", { id: "reco", items: (["book", "article", "video"] as AgendaLinkKind[]).map((kind) => ({ ...newLinkItem(kind), id: `reco-${kind}` })) }),
      newCard("eldersInfo", { id: "eldersInfo" }),
    ]),
    t("letters", "Revisão das últimas cartas da filial", 5, [newCard("notes", { id: "letters", perm: "coordinator" })]),
    t("recs", "Recomendações para anciãos e servos ministeriais / cancelamentos", 20, [newCard("recs", { id: "recs" })]),
    t("local", "Assunto local solicitado pelo corpo de anciãos", 10, [newCard("local", { id: "local" })]),
    t("scReading", "Superintendente de Circuito – Recomendação de leitura e meditação", 0, [newCard("scReply", { id: "scReading" })]),
  ];
}

export function emptyAgenda(): AgendaPayload {
  return { v: 3, prayerOpen: "", prayerRec: "", prayerClose: "", minutesTaker: "", prayersPerm: "coordinator", deadlineAt: null, blocks: defaultBlocks(),
    showPrayerRec: true, showMinutes: true, headerTitle: DEFAULT_AGENDA_TITLE, headerVerses: DEFAULT_AGENDA_VERSES, scRecs: {}, pdfStyle: "timeline" };
}

const str = (v: unknown, max = 200_000) => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const mins = (v: unknown, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 240 ? n : d; };
const access = (v: unknown, d: AgendaAccess): AgendaAccess => (v === "sc" || v === "coordinator" || v === "all" ? v : d);
const ID_RE = /^[\w-]{1,64}$/;
const idOk = (v: unknown) => (typeof v === "string" && ID_RE.test(v) ? v : newId());

/** Só http(s); qualquer outra coisa vira vazio. */
export function safeUrl(v: unknown): string {
  const s = str(v, 2000).trim();
  if (!s) return "";
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try { const u = new URL(withProto); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : ""; } catch { return ""; }
}
const kindOk = (v: unknown): AgendaLinkKind => (v === "article" || v === "video" ? v : "book");

/** Converte o formato antigo (texto com "|" + links soltos) em partes: 1º nome ↔ 1º link. */
export function partsFromLegacy(text: string, urls: string[]): AgendaLinkPart[] {
  const titles = text.split("|").map((t) => t.trim()).filter(Boolean);
  const good = urls.map(safeUrl);
  const n = Math.max(titles.length, good.filter(Boolean).length ? good.length : 0);
  const out: AgendaLinkPart[] = [];
  for (let i = 0; i < n; i++) {
    const title = titles[i] ?? "";
    const url = good[i] ?? "";
    if (!title && !url) continue;
    out.push({ id: newId(), title: title || `Link ${i + 1}`, url });
  }
  return out;
}
export function withParts(it: Omit<AgendaLinkItem, "text" | "urls" | "parts"> & { parts: AgendaLinkPart[] }): AgendaLinkItem {
  const parts = it.parts.length ? it.parts : [{ id: newId(), title: "", url: "" }];
  return { ...it, parts, text: parts.map((x) => x.title.trim()).filter(Boolean).join(" | "), urls: parts.map((x) => x.url) };
}
export const newLinkItem = (kind: AgendaLinkKind): AgendaLinkItem => withParts({ id: newId(), kind, parts: [] });

function normItem(raw: unknown): AgendaLinkItem {
  const r = obj(raw);
  let parts: AgendaLinkPart[];
  if (Array.isArray(r.parts)) {
    parts = r.parts.slice(0, 10).map((x) => { const o = obj(x); const u = str(o.url, 2000);
      return { id: idOk(o.id), title: str(o.title, 300), url: u.trim() ? safeUrl(u) : "" }; });
  } else {
    const urls = (Array.isArray(r.urls) ? r.urls : []).slice(0, 10).map((u) => (typeof u === "string" ? u : ""));
    parts = partsFromLegacy(str(r.text, 500), urls).slice(0, 10);
  }
  return withParts({ id: idOk(r.id), kind: kindOk(r.kind), parts });
}
const CLOUD_PATH_RE = /^[0-9a-f-]{36}\/[\w-]{1,64}\.(jpg|pdf)$/;
function normAttachment(raw: unknown): AgendaAttachment | null {
  const r = obj(raw);
  const kind: AgendaAttachmentKind | null = r.kind === "photo" || r.kind === "pdf" || r.kind === "link" ? r.kind : null;
  if (!kind) return null;
  const url = kind === "link" ? safeUrl(r.url) : "";
  if (kind === "link" && !url) return null;
  const cloudPath = kind !== "link" && typeof r.cloudPath === "string" && CLOUD_PATH_RE.test(r.cloudPath) ? r.cloudPath : "";
  return { id: idOk(r.id), kind, title: str(r.title, 200) || (kind === "pdf" ? "PDF" : kind === "photo" ? "Foto" : "Link"), url, cloudPath,
    size: Math.max(0, Math.min(MAX_CLOUD_BYTES * 10, Math.round(Number(r.size) || 0))) };
}
function strMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(raw)).slice(0, 50)) if (ID_RE.test(k) && typeof v === "string") out[k] = str(v);
  return out;
}
function recInfoMap(raw: unknown): Record<string, AgendaRecInfo> {
  const out: Record<string, AgendaRecInfo> = {};
  for (const [k, v] of Object.entries(obj(raw)).slice(0, 50)) {
    if (!ID_RE.test(k)) continue;
    const r = obj(v);
    out[k] = { family: str(r.family, 1000), fieldGroup: str(r.fieldGroup, 300), info: str(r.info) };
  }
  return out;
}
const cardTypeOk = (v: unknown): AgendaCardType => (CARD_TYPES as unknown[]).includes(v) ? (v as AgendaCardType) : "notes";

export function normalizeCard(raw: unknown): AgendaCard {
  const r = obj(raw);
  const type = cardTypeOk(r.type);
  return {
    id: idOk(r.id), type, perm: type === "private" ? "sc" : access(r.perm, DEFAULT_PERM[type]),
    showSubject: r.showSubject === true, subject: str(r.subject, 300), html: str(r.html),
    items: type === "links" ? (Array.isArray(r.items) ? r.items : []).slice(0, 30).map(normItem) : [],
    notes: type === "recs" ? strMap(r.notes) : {},
    recInfo: type === "recs" ? recInfoMap(r.recInfo) : {},
    attachments: ATTACHABLE.includes(type) ? (Array.isArray(r.attachments) ? r.attachments : []).slice(0, 20).map(normAttachment).filter((a): a is AgendaAttachment => !!a) : [],
    hidden: type !== "private" && r.hidden === true,
    ...eldersInfoParts(type, r),
  };
}

function questionList(raw: unknown): AgendaQuestion[] {
  return (Array.isArray(raw) ? raw : []).slice(0, MAX_QUESTIONS).map((q) => { const o = obj(q); return { id: idOk(o.id), text: str(o.text, 300) }; });
}
/** Resposta do checklist: aceita as três opções; o antigo "marcado" (true) vira "Sim". */
export function checkAnswerOf(v: unknown): AgendaCheckAnswer | null {
  if (v === true) return "yes";
  return v === "yes" || v === "no" || v === "partial" ? v : null;
}
function normResponse(raw: unknown): AgendaElderResponse {
  const o = obj(raw);
  const checks: Record<string, AgendaCheckAnswer> = {};
  for (const [k, v] of Object.entries(obj(o.checks)).slice(0, MAX_QUESTIONS)) {
    if (!ID_RE.test(k)) continue;
    const a = checkAnswerOf(v);
    if (a) checks[k] = a;
  }
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(o.answers)).slice(0, MAX_QUESTIONS)) if (ID_RE.test(k)) answers[k] = str(v, 5000);
  const key = str(o.authorKey, 64);
  return { id: idOk(o.id), authorKey: /^[0-9a-f]{64}$/.test(key) ? key : "", name: str(o.name, 80), checks, answers, html: str(o.html, 50_000), updatedAt: str(o.updatedAt, 40) };
}
/** Campos do cartão eldersInfo; o texto antigo do campo único vira a primeira resposta. */
function eldersInfoParts(type: AgendaCardType, r: Record<string, unknown>): Pick<AgendaCard, "checklist" | "questions" | "responses"> & { html?: string } {
  if (type !== "eldersInfo") return { checklist: [], questions: [], responses: [] };
  const responses = (Array.isArray(r.responses) ? r.responses : []).slice(0, MAX_RESPONSES).map(normResponse);
  const legacy = str(r.html);
  if (legacy.replace(/<[^>]*>/g, "").trim() && !responses.some((x) => x.id === "legacy")) {
    responses.unshift({ id: "legacy", authorKey: "", name: "Resposta anterior", checks: {}, answers: {}, html: legacy, updatedAt: "" });
  }
  return { checklist: questionList(r.checklist), questions: questionList(r.questions), responses: responses.slice(0, MAX_RESPONSES), html: "" };
}

/** Bloco do formato v2 (um tipo por bloco) vira tópico com um cartão de mesmo id. */
function legacyBlockToTopic(r: Record<string, unknown>): AgendaBlock {
  const id = idOk(r.id);
  const t = r.type;
  const type: AgendaCardType = t === "links" ? "links" : t === "recs" ? "recs" : t === "local" ? "local"
    : id === "eldersInfo" ? "eldersInfo" : id === "scReading" ? "scReply" : "notes";
  const card = normalizeCard({ ...r, id, type });
  const title = str(r.title, 200).replace(/^\s*\d+[).]\s*/, "") || CARD_TYPE_LABEL[type];
  return { id, title, minutes: mins(r.minutes, 0), hidden: r.hidden === true, cards: [card] };
}
const renameTitle = (t: string) => (t.trim() === "Informações dos anciãos" ? CARD_TYPE_LABEL.eldersInfo : t);
function normalizeTopic(raw: unknown): AgendaBlock {
  const r = obj(raw);
  if (!Array.isArray(r.cards)) return legacyBlockToTopic(r);
  return {
    id: idOk(r.id), title: renameTitle(str(r.title, 200).replace(/^\s*\d+[).]\s*/, "")) || "Tópico",
    minutes: mins(r.minutes, 0), hidden: r.hidden === true,
    cards: r.cards.slice(0, MAX_CARDS).map(normalizeCard),
  };
}

export const normalizeBlocks = (raw: unknown): AgendaBlock[] => {
  const src = (Array.isArray(raw) ? raw : []).slice(0, MAX_BLOCKS);
  const legacy = src.some((b) => !Array.isArray(obj(b).cards));
  let list = src.map(normalizeTopic);
  if (legacy) {
    // Pauta antiga no padrão: "Recomendações para assistir" e "Informações dos anciãos" viram cartões de "Encorajamentos".
    const enc = list.find((b) => b.id === "enc");
    if (enc) {
      const moved = list.filter((b) => (b.id === "reco" || b.id === "eldersInfo") && b.minutes === 0);
      if (moved.length) {
        enc.cards = [...enc.cards, ...moved.flatMap((b) => b.cards)].slice(0, MAX_CARDS);
        list = list.filter((b) => !moved.includes(b));
      }
    }
  }
  const seenB = new Set<string>(), seenC = new Set<string>();
  return list.map((b) => {
    const id = seenB.has(b.id) ? newId() : b.id; seenB.add(id);
    const cards = b.cards.map((c) => { const cid = seenC.has(c.id) ? newId() : c.id; seenC.add(cid); return cid === c.id ? c : { ...c, id: cid }; });
    return { ...b, id, cards };
  });
};

/** Converte a pauta do formato antigo (campos fixos) para tópicos, sem perder nada. */
function fromLegacy(r: Record<string, unknown>, perms: Record<string, unknown>): AgendaPayload {
  const d = emptyAgenda();
  const p = (g: string, def: AgendaAccess) => access(perms[g], def);
  const links = (Array.isArray(r.links) ? r.links : []) as Array<Record<string, unknown>>;
  const patchCard = (c: AgendaCard): AgendaCard => {
    switch (c.id) {
      case "enc": return { ...c, subject: str(r.encTheme, 300), perm: p("enc", "sc"), html: str(r.scInfo) };
      case "reco": return { ...c, perm: p("reco", "sc"), html: str(r.reco), items: c.items.map((it, i) => {
        const l = links[i] ?? {}; return withParts({ id: it.id, kind: it.kind, parts: partsFromLegacy(str(l.label, 500), [str(l.url, 2000)]) });
      }) };
      case "eldersInfo": return normalizeCard({ ...c, perm: p("eldersInfo", "all"), html: str(r.eldersInfo) });
      case "letters": return { ...c, perm: p("letters", "coordinator"), html: str(r.letters) };
      case "recs": return { ...c, perm: p("recs", "all"), notes: strMap(r.recNotes) };
      case "local": return { ...c, perm: p("local", "all"), html: str(r.localNotes) };
      case "scReading": return { ...c, perm: p("scReading", "sc"), html: str(r.scReading) };
      default: return c;
    }
  };
  const minutesOf: Record<string, number> = { enc: mins(r.encMinutes, 15), letters: mins(r.lettersMinutes, 5), recs: mins(r.recsMinutes, 20), local: mins(r.localMinutes, 10) };
  const blocks = d.blocks.map((b) => ({ ...b, minutes: minutesOf[b.id] ?? b.minutes, cards: b.cards.map(patchCard) }));
  return { ...d, prayerOpen: str(r.prayerOpen, 120), prayerRec: str(r.prayerRec, 120), prayerClose: str(r.prayerClose, 120),
    minutesTaker: str(r.minutesTaker, 120), prayersPerm: p("prayers", "coordinator"), blocks };
}

function scRecMap(raw: unknown): Record<string, AgendaScRec> {
  const out: Record<string, AgendaScRec> = {};
  for (const [k, v] of Object.entries(obj(raw)).slice(0, 50)) {
    if (!ID_RE.test(k)) continue;
    const r = obj(v);
    out[k] = { comment: str(r.comment, 20_000), decision: r.decision === "assign" || r.decision === "decline" ? r.decision : null };
  }
  return out;
}
/** Campos novos com padrão: pautas antigas abrem iguais. */
function extras(r: Record<string, unknown>) {
  return {
    showPrayerRec: r.showPrayerRec !== false, showMinutes: r.showMinutes !== false,
    headerTitle: typeof r.headerTitle === "string" ? str(r.headerTitle, 200) : DEFAULT_AGENDA_TITLE,
    headerVerses: typeof r.headerVerses === "string" ? str(r.headerVerses, 600) : DEFAULT_AGENDA_VERSES,
    scRecs: scRecMap(r.scRecs),
    pdfStyle: agendaPdfStyleOf(r.pdfStyle),
  };
}

function deadline(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function normalizeAgenda(raw: unknown, legacyPerms?: unknown): AgendaPayload {
  const r = obj(raw);
  if (r.v !== 2 && r.v !== 3) {
    if (Object.keys(r).length === 0) return emptyAgenda();
    return fromLegacy(r, obj(legacyPerms));
  }
  return {
    v: 3, prayerOpen: str(r.prayerOpen, 120), prayerRec: str(r.prayerRec, 120), prayerClose: str(r.prayerClose, 120),
    minutesTaker: str(r.minutesTaker, 120), prayersPerm: access(r.prayersPerm, "coordinator"), deadlineAt: deadline(r.deadlineAt),
    blocks: normalizeBlocks(r.blocks), ...extras(r),
  };
}

export function canEdit(role: AgendaRole, perm: AgendaAccess): boolean {
  if (role === "sc") return true;
  if (perm === "all") return true;
  return perm === "coordinator" && role === "coordinator";
}
/** Cartão privado é sempre só do SC, qualquer que seja o selo. */
export const canEditCard = (role: AgendaRole, c: Pick<AgendaCard, "type" | "perm">) => (c.type === "private" ? role === "sc" : canEdit(role, c.perm));
export function isLocked(p: Pick<AgendaPayload, "deadlineAt">, now = Date.now()): boolean {
  return !!p.deadlineAt && Date.parse(p.deadlineAt) <= now;
}
/** Pode editar agora (prazo encerrado trava todos menos o SC). */
export const canEditNow = (role: AgendaRole, perm: AgendaAccess, p: Pick<AgendaPayload, "deadlineAt">, now = Date.now()) =>
  role === "sc" || (!isLocked(p, now) && canEdit(role, perm));

/** Cartão que só o SC vê (nota privada ou cartão oculto). */
export const isScOnlyCard = (c: Pick<AgendaCard, "type" | "hidden">) => c.type === "private" || c.hidden;
/** Tira tudo que é só do SC (notas privadas, cartões ocultos, comentários/decisões): nunca sai do servidor para anciãos, nem vai ao PDF. */
export function withoutPrivate(p: AgendaPayload): AgendaPayload {
  return { ...p, scRecs: {}, blocks: p.blocks.map((b) => ({ ...b, cards: b.cards.filter((c) => !isScOnlyCard(c)) })) };
}

/** Oração recomendação só existe com o interruptor ligado e alguma recomendação na visita. */
export const prayerRecShown = (p: Pick<AgendaPayload, "showPrayerRec">, a: Pick<AgendaAuto, "recommendations">) => p.showPrayerRec && a.recommendations.length > 0;

/** Texto das três partes da S-303, nesta ordem, para "Informações do SC". */
export function s303Html(x: { positivos?: string; encorajar?: string; preocupantes?: string }): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const part = (label: string, v?: string) => {
    const t = (v ?? "").trim(); if (!t) return "";
    return `<p><strong>${esc(label)}</strong></p>${t.split(/\n+/).map((l) => `<p>${esc(l)}</p>`).join("")}`;
  };
  return [part("Destaques positivos e elogios", x.positivos), part("Pontos para encorajar (Atos 11:23)", x.encorajar), part("Pontos preocupantes (Tito 1:5)", x.preocupantes)].join("");
}

/** Semana (segunda a domingo) que contém a data, em yyyy-mm-dd. */
export function weekOf(isoDate: string): { from: string; to: string } {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  const mon = new Date(d.getTime() - dow * 86_400_000), sun = new Date(mon.getTime() + 6 * 86_400_000);
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
}

/**
 * SC grava tudo (estrutura, títulos, ordem, prazo, cartões). Os outros só o conteúdo dos cartões que podem editar,
 * e nada depois do prazo. Estrutura e anexos são sempre os salvos.
 */
/** Respostas do cartão eldersInfo: quem não é SC só troca/insere/apaga a resposta com a própria chave. */
export function mergeResponses(cur: AgendaElderResponse[], inc: AgendaElderResponse[], authorHash: string | null): AgendaElderResponse[] {
  if (!authorHash) return cur;
  const mine = inc.find((x) => x.authorKey === authorHash);
  const others = cur.filter((x) => x.authorKey !== authorHash);
  const at = cur.findIndex((x) => x.authorKey === authorHash);
  if (!mine) return others;
  const next = { ...mine, id: at >= 0 ? cur[at].id : mine.id };
  if (at >= 0) { const out = cur.slice(); out[at] = next; return out; }
  return others.length >= MAX_RESPONSES ? others : [...others, next];
}
/** Nome mostrado: o digitado ou "Ancião N" pela posição. */
export const responseName = (r: AgendaElderResponse, i: number) => r.name.trim() || `Ancião ${i + 1}`;

export function mergeAgenda(current: AgendaPayload, incoming: AgendaPayload, role: AgendaRole, now = Date.now(), authorHash: string | null = null): AgendaPayload {
  if (role === "sc") return incoming;
  if (isLocked(current, now)) return current;
  const inc = new Map(incoming.blocks.flatMap((b) => b.cards).map((c) => [c.id, c]));
  const out: AgendaPayload = { ...current, blocks: current.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => {
    const n = inc.get(c.id);
    if (!n || n.type !== c.type || !canEditCard(role, c)) return c;
    if (c.type === "eldersInfo") return { ...c, responses: mergeResponses(c.responses, n.responses, authorHash) };
    return { ...c, subject: n.subject, html: n.html, notes: n.notes, recInfo: n.recInfo, items: c.type === "links" ? n.items : c.items };
  }) })) };
  if (canEdit(role, current.prayersPerm)) {
    out.prayerOpen = incoming.prayerOpen; out.prayerRec = incoming.prayerRec; out.prayerClose = incoming.prayerClose; out.minutesTaker = incoming.minutesTaker;
  }
  return out;
}

export interface AgendaAutoRec { id: string; title: string; family: string; fieldGroup: string; info: string; name?: string; purpose?: string }
export interface AgendaAuto {
  meetingAt: string | null; location: string | null; theme: string | null;
  openingPrayer: string | null; closingPrayer: string | null;
  recommendations: AgendaAutoRec[];
  local: Array<{ id: string; suggestedBy: string; subject: string; sources: string; info: string }>;
}
export const emptyAuto = (): AgendaAuto => ({ meetingAt: null, location: null, theme: null, openingPrayer: null, closingPrayer: null, recommendations: [], local: [] });

export const RECOMMENDATION_PURPOSE: Record<string, string> = {
  ministerial_servant: "Servo Ministerial", elder: "Ancião", redesignation: "Redesignação", removal: "Cancelamento", cca_change: "Mudança de CCA",
};

/** Membros da família / grupo / informações: o editado na pauta vence; vazio cai no Programa dos anciãos. */
export function recInfoView(c: AgendaCard, r: AgendaAutoRec): AgendaRecInfo {
  const o = c.recInfo[r.id];
  return { family: o?.family || r.family, fieldGroup: o?.fieldGroup || r.fieldGroup, info: o?.info || r.info };
}

/**
 * Tópico oculto sozinho: só tem cartões que puxam dados (recomendações/assuntos locais)
 * e o Programa dos anciãos não tem nenhum item daquele tipo.
 */
export function autoHidden(b: AgendaBlock, a: AgendaAuto): boolean {
  if (!b.cards.length) return false;
  return b.cards.every((c) => (c.type === "recs" && a.recommendations.length === 0) || (c.type === "local" && a.local.length === 0));
}
export const isShown = (b: AgendaBlock, a?: AgendaAuto) => !b.hidden && !(a && autoHidden(b, a));

export interface NumberedBlock { block: AgendaBlock; n: number; startMin: number }
/** Tópicos visíveis numerados pela ordem escolhida, com minuto de início acumulado. */
export function numberedBlocks(blocks: AgendaBlock[], auto?: AgendaAuto): NumberedBlock[] {
  let acc = 0;
  return blocks.filter((b) => isShown(b, auto)).map((block, i) => { const r = { block, n: i + 1, startMin: acc }; acc += block.minutes; return r; });
}

/** O que aparece na tela/PDF: o digitado vence; vazio cai no que veio do Programa da visita. */
export function agendaView(p: AgendaPayload, a: AgendaAuto) {
  return {
    prayerOpen: p.prayerOpen || a.openingPrayer || "",
    prayerClose: p.prayerClose || a.closingPrayer || "",
    totalMinutes: p.blocks.filter((b) => isShown(b, a)).reduce((s, b) => s + b.minutes, 0),
  };
}

/** Todas as URLs válidas de uma linha de links. */
export const itemUrls = (it: AgendaLinkItem) => (it.parts ?? []).map((x) => safeUrl(x.url)).filter(Boolean);
/** Partes com nome ou link, para exibir. */
export const shownParts = (it: AgendaLinkItem) => (it.parts ?? []).filter((x) => x.title.trim() || x.url).map((x, i) => ({ ...x, title: x.title.trim() || `Link ${i + 1}`, url: safeUrl(x.url) }));

/** Anexos que os anciãos podem ver (link ou arquivo enviado à nuvem). */
export const sharedAttachments = (c: AgendaCard) => (c.type === "private" ? [] : c.attachments.filter((a) => a.kind === "link" || !!a.cloudPath));
export const cloudAttachmentCount = (p: AgendaPayload) => p.blocks.reduce((s, b) => s + b.cards.reduce((t, c) => t + c.attachments.filter((a) => a.cloudPath).length, 0), 0);

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
/** Modelo leva só a estrutura e textos-base: nada de dados de visita (por irmão), nem anexos. */
export const stripForTemplate = (blocks: AgendaBlock[]): AgendaBlock[] =>
  blocks.map((b) => ({ ...b, cards: b.cards.map((c) => ({ ...c, notes: {}, recInfo: {}, attachments: [] })) }));

export interface AgendaHeader { title: string; verses: string }
export interface AgendaTemplateFile { kind: "visita-sc/agenda-template"; version: 2; name: string; blocks: AgendaBlock[]; header?: AgendaHeader }
export function templateToFile(name: string, blocks: AgendaBlock[], header?: AgendaHeader): AgendaTemplateFile {
  return { kind: "visita-sc/agenda-template", version: 2, name: name.slice(0, 120), blocks: stripForTemplate(blocks), ...(header ? { header } : {}) };
}
export function parseTemplateHeader(text: string): AgendaHeader | null {
  try {
    const h = obj(obj(JSON.parse(text)).header);
    return typeof h.title === "string" ? { title: str(h.title, 200), verses: str(h.verses, 600) } : null;
  } catch { return null; }
}
export function parseTemplateFile(text: string): { name: string; blocks: AgendaBlock[] } | null {
  try {
    const r = JSON.parse(text) as Record<string, unknown>;
    if (r.kind !== "visita-sc/agenda-template" || !Array.isArray(r.blocks)) return null;
    const blocks = normalizeBlocks(r.blocks);
    if (!blocks.length) return null;
    return { name: str(r.name, 120) || "Modelo importado", blocks: stripForTemplate(blocks) };
  } catch { return null; }
}

/** Aplica um modelo: estrutura do modelo; o que já foi escrito num cartão de mesmo id/estilo é mantido. */
export function applyTemplate(current: AgendaBlock[], tpl: AgendaBlock[]): AgendaBlock[] {
  const cur = new Map(current.flatMap((b) => b.cards).map((c) => [c.id, c]));
  return tpl.map((t) => ({ ...t, cards: t.cards.map((tc) => {
    const c = cur.get(tc.id);
    if (!c || c.type !== tc.type) return { ...tc, notes: {}, recInfo: {}, attachments: [] };
    const hasLinks = c.items.some((it) => it.text || itemUrls(it).length);
    return { ...tc, html: c.html || tc.html, subject: c.subject || tc.subject, notes: c.notes, recInfo: c.recInfo, attachments: c.attachments, items: hasLinks ? c.items : tc.items };
  }) }));
}
