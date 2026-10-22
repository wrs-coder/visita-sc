// Espaço pessoal da esposa (Anotações, Leitura da Bíblia, Pesquisas).
// Guardado só no aparelho (IndexedDB, reserva em localStorage), separado por
// código de convite. Nada vai para o servidor.
import { get as idbGet, set as idbSet } from "idb-keyval";
import { packBackupZip, unpackBackupZip } from "./backup-package";

export type WsKind = "note" | "bible" | "research";
export interface WsItem { id: string; kind: WsKind; title: string; body: string; folderId: string | null; color: string | null; updatedAt: string }
export interface WsFolder { id: string; name: string }
export interface WsSettings { fontSize: "sm" | "md" | "lg"; width: "narrow" | "wide" }
export interface WsData { items: WsItem[]; folders: WsFolder[]; settings: WsSettings }

export const WS_PREFIX = "guest.workspace.";
const DATA_KEY = `${WS_PREFIX}data`; // chave antiga (migração) e nome no backup
const HISTORY_KEY = "bible:history:v1";
export const WS_COLORS = ["primary", "accent", "secondary", "muted"] as const;

export const emptyWs = (): WsData => ({ items: [], folders: [], settings: { fontSize: "md", width: "narrow" } });

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
    return o && typeof o.id === "string" ? [{ id: str(o.id, 64), name: str(o.name, 120) }] : [];
  }) : [];
  const s = (r.settings ?? {}) as Record<string, unknown>;
  return { items, folders, settings: {
    fontSize: s.fontSize === "sm" || s.fontSize === "lg" ? s.fontSize : "md",
    width: s.width === "wide" ? "wide" : "narrow",
  } };
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
  return md ? `# ${i.title || "Sem título"}\n\n${i.body}\n` : `${i.title || "Sem título"}\n\n${i.body}\n`;
}
