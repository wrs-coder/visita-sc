// Espaço pessoal da esposa (Anotações, Leitura da Bíblia, Pesquisas).
// Guardado só no aparelho (IndexedDB, reserva em localStorage), separado por
// código de convite. Nada vai para o servidor.
import { get as idbGet, set as idbSet } from "idb-keyval";
import { packBackupZip, unpackBackupZip } from "./backup-package";
import { isValidChapterKey, chaptersOf, type ReadingPlan, type Highlight, type CustomPlan } from "./bible-chapters";

export type WsKind = "note" | "bible" | "research";
export interface WsItem { id: string; kind: WsKind; title: string; body: string; folderId: string | null; color: string | null; updatedAt: string }
export interface WsFolder { id: string; name: string; kind?: WsKind }
export interface WsSettings { fontSize: "sm" | "md" | "lg"; width: "narrow" | "wide" }
export interface WsReading { plan: ReadingPlan; startDate: string; done: string[]; custom?: CustomPlan }
export interface WsData { items: WsItem[]; folders: WsFolder[]; settings: WsSettings; reading: WsReading; highlights: Highlight[] }

export const WS_PREFIX = "guest.workspace.";
const DATA_KEY = `${WS_PREFIX}data`; // chave antiga (migração) e nome no backup
const HISTORY_KEY = "bible:history:v1";
export const WS_COLORS = ["primary", "accent", "secondary", "muted"] as const;

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const emptyWs = (): WsData => ({ items: [], folders: [], settings: { fontSize: "md", width: "narrow" },
  reading: { plan: "canon", startDate: todayIso(), done: [] }, highlights: [] });

/** Impressão digital do código de convite (o código não fica gravado em claro). */
export function wsSessionKey(code: string | null | undefined): string {
  const s = (code ?? "").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return s ? (h >>> 0).toString(36) : "anon";
}
const keyFor = (sk: string) => `${WS_PREFIX}${sk}.data`;

async function rawGet(k: string): Promise<string | undefined> {
  try { const v = await idbGet<string>(k); if (typeof v === "string") return v; } catch { /* sem IDB */ }
  try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; }
}
async function rawSet(k: string, v: string) {
  try { await idbSet(k, v); return; } catch { /* sem IDB */ }
  try { localStorage.setItem(k, v); } catch { /* cheio */ }
}

export async function loadWs(sk: string): Promise<WsData> {
  try {
    const raw = await rawGet(keyFor(sk));
    if (raw) return sanitizeWs(JSON.parse(raw));
    const legacy = typeof localStorage !== "undefined" ? localStorage.getItem(DATA_KEY) : null;
    if (legacy) {
      const d = sanitizeWs(JSON.parse(legacy));
      await rawSet(keyFor(sk), JSON.stringify(d));
      localStorage.removeItem(DATA_KEY);
      return d;
    }
  } catch { /* corrompido */ }
  return emptyWs();
}

export function saveWs(sk: string, d: WsData): Promise<void> {
  return rawSet(keyFor(sk), JSON.stringify(d));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function sanitizeWs(raw: unknown): WsData {
  const base = emptyWs();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const kinds: WsKind[] = ["note", "bible", "research"];
  const items = Array.isArray(r.items) ? r.items.slice(0, 5000).flatMap((x): WsItem[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    if (!kinds.includes(o.kind as WsKind) || typeof o.id !== "string") return [];
    return [{ id: str(o.id, 64), kind: o.kind as WsKind, title: str(o.title, 300), body: str(o.body, 500_000),
      folderId: typeof o.folderId === "string" ? str(o.folderId, 64) : null,
      color: typeof o.color === "string" && (WS_COLORS as readonly string[]).includes(o.color) ? o.color : null,
      updatedAt: str(o.updatedAt, 40) || new Date().toISOString() }];
  }) : [];
  const folders = Array.isArray(r.folders) ? r.folders.slice(0, 500).flatMap((x): WsFolder[] => {
    const o = x as Record<string, unknown>;
    if (!o || typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return [];
    const k = kinds.includes(o.kind as WsKind) ? { kind: o.kind as WsKind } : {};
    return [{ id: str(o.id, 64), name: str(o.name, 120), ...k }];
  }) : [];
  // Pastas antigas sem aba: vão para a aba dos seus itens (copiadas se houver várias).
  for (const f of folders.filter((x) => !x.kind)) {
    const used = [...new Set(items.filter((i) => i.folderId === f.id).map((i) => i.kind))];
    if (used.length <= 1) { f.kind = used[0] ?? "note"; continue; }
    f.kind = used[0];
    for (const k of used.slice(1)) {
      const nid = `${f.id}-${k}`.slice(0, 64);
      if (!folders.some((x) => x.id === nid)) folders.push({ id: nid, name: f.name, kind: k });
      for (const i of items) if (i.folderId === f.id && i.kind === k) i.folderId = nid;
    }
  }
  const s = (r.settings ?? {}) as Record<string, unknown>;
  const rd = (r.reading ?? {}) as Record<string, unknown>;
  const plan: ReadingPlan = rd.plan === "chrono" || rd.plan === "year" || rd.plan === "custom" ? rd.plan : "canon";
  const done = Array.isArray(rd.done) ? [...new Set(rd.done.filter((k): k is string => typeof k === "string" && isValidChapterKey(k)))] : [];
  const sd = str(rd.startDate, 10);
  const cu = (rd.custom ?? null) as Record<string, unknown> | null;
  const custom: CustomPlan | undefined = cu && typeof cu === "object" ? {
    books: Array.isArray(cu.books) ? [...new Set(cu.books.filter((b): b is string => typeof b === "string" && /^B\d\d$/.test(b) && chaptersOf(b) > 0))] : [],
    perDay: typeof cu.perDay === "number" && Number.isInteger(cu.perDay) && cu.perDay >= 1 && cu.perDay <= 50 ? cu.perDay : null,
    endDate: typeof cu.endDate === "string" && /^\d{4}-\d\d-\d\d$/.test(cu.endDate) ? cu.endDate : null,
  } : undefined;
  const highlights = Array.isArray(r.highlights) ? r.highlights.slice(0, 5000).flatMap((x): Highlight[] => {
    const o = x as Record<string, unknown>;
    if (!o || typeof o.id !== "string") return [];
    const b = typeof o.bookId === "string" && /^B\d\d$/.test(o.bookId) && chaptersOf(o.bookId) > 0 ? o.bookId : null;
    return [{ id: str(o.id, 64), ref: str(o.ref, 120), bookId: b, text: str(o.text, 20_000), date: str(o.date, 40) || new Date().toISOString() }];
  }) : [];
  return { items, folders, settings: {
    fontSize: s.fontSize === "sm" || s.fontSize === "lg" ? s.fontSize : "md",
    width: s.width === "wide" ? "wide" : "narrow",
  }, reading: { plan, done, startDate: /^\d{4}-\d\d-\d\d$/.test(sd) ? sd : base.reading.startDate, ...(custom ? { custom } : {}) }, highlights };
}

export async function buildWsBackup(d: WsData): Promise<Blob> {
  return packBackupZip({
    manifest: { type: "visita_sc_backup_zip", version: 3, exportedAt: new Date().toISOString(), app: "visita-sc" },
    server: { scope: "guest-workspace" },
    client: { indexedDB: {}, localStorage: {
      [DATA_KEY]: JSON.stringify(d),
      ...(typeof localStorage !== "undefined" && localStorage.getItem(HISTORY_KEY) ? { [HISTORY_KEY]: localStorage.getItem(HISTORY_KEY)! } : {}),
    }, notes: [], folders: [], libraries: [], bibles: [] },
  });
}

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export async function readWsBackup(file: File): Promise<WsData> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("too_big");
  if (file.name.toLowerCase().endsWith(".json")) return sanitizeWs(JSON.parse(await file.text()));
  const full = await unpackBackupZip(file);
  const raw = full.client?.localStorage?.[DATA_KEY];
  const hist = full.client?.localStorage?.[HISTORY_KEY];
  if (hist) { try { if (Array.isArray(JSON.parse(hist))) localStorage.setItem(HISTORY_KEY, hist.slice(0, 20000)); } catch { /* ignora */ } }
  if (!raw) throw new Error("no_workspace");
  return sanitizeWs(JSON.parse(raw));
}

export function itemToText(i: WsItem, md: boolean) {
  const b = htmlToPlain(i.body);
  return md ? `# ${i.title || "Sem título"}\n\n${b}\n` : `${i.title || "Sem título"}\n\n${b}\n`;
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Texto simples antigo vira HTML; HTML fica como está. */
export function toNoteHtml(body: string): string {
  if (!body.trim()) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(body)) return body;
  return body.split(/\n/).map((l) => `<p>${escapeHtml(l)}</p>`).join("");
}
export const htmlToPlain = (html: string) => html.replace(/<\/(p|h\d|li|blockquote|div)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
/** Anotação criada a partir de um versículo. */
export function verseNoteHtml(ref: string, text: string): string {
  return `<blockquote><p><strong>${escapeHtml(ref)}</strong> ${escapeHtml(text)}</p></blockquote><p></p>`;
}

/** Referência bíblica destacada (fica clicável na leitura). */
export const refHtml = (ref: string) => `<p><strong>${escapeHtml(ref.slice(0, 120))}</strong></p>`;
export const noteBlockHtml = (text: string) => `<blockquote><p><strong>Nota:</strong> ${escapeHtml(text.slice(0, 5000))}</p></blockquote><p></p>`;
export const internalLinkHtml = (id: string, title: string) =>
  /^[A-Za-z0-9-]{1,64}$/.test(id) ? `<p><a href="#ws:${id}">${escapeHtml(title.slice(0, 300))}</a></p>` : "";

/** Lista filtrada (tipo, pasta, cor, palavra no título ou texto), mais recentes primeiro. */
export function filterWsItems(items: WsItem[], f: { kind: WsKind; folder: string | null; color: string | null; query: string }): WsItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((i) => i.kind === f.kind && (!f.folder || i.folderId === f.folder) && (!f.color || i.color === f.color)
    && (!q || i.title.toLowerCase().includes(q) || htmlToPlain(i.body).toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
