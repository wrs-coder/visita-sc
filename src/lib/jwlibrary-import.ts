// Importa notas bíblicas de um backup do JW Library (.jwlibrary) só no aparelho.
// O backup é um zip com userData.db (SQLite) e, às vezes, userData.db-wal com as
// alterações mais recentes: juntamos o WAL antes de ler, para não perder notas.
// Só entram notas ligadas à Bíblia (KeySymbol nwt*, livros 1-66). Marcações sem
// nota não têm texto e não entram (regra: nenhum texto bíblico embutido).
import JSZip from "jszip";
import type { SqlJsStatic, Database } from "sql.js";
import { bookId, chaptersOf } from "./bible-chapters";

export interface JwNote { id: string; bookId: string; chapter: number; verse: number | null; title: string; text: string; tags: string[]; date: string }

const MAX_ZIP = 60 * 1024 * 1024;
const MAX_DB = 200 * 1024 * 1024;

/** Aplica os quadros confirmados do WAL sobre o arquivo principal do SQLite. */
export function mergeWal(db: Uint8Array, wal: Uint8Array | null): Uint8Array {
  if (!wal || wal.length < 32) return db;
  const dv = new DataView(wal.buffer, wal.byteOffset, wal.byteLength);
  const magic = dv.getUint32(0);
  if (magic !== 0x377f0682 && magic !== 0x377f0683) return db;
  let pageSize = dv.getUint32(8); if (pageSize === 1) pageSize = 65536;
  if (pageSize < 512 || pageSize > 65536) return db;
  const salt1 = dv.getUint32(16), salt2 = dv.getUint32(20);
  const frame = 24 + pageSize;
  const pages = new Map<number, Uint8Array>();
  let pending = new Map<number, Uint8Array>();
  let dbPages = Math.floor(db.length / pageSize);
  for (let off = 32; off + frame <= wal.length; off += frame) {
    if (dv.getUint32(off + 8) !== salt1 || dv.getUint32(off + 12) !== salt2) break;
    const pg = dv.getUint32(off), commit = dv.getUint32(off + 4);
    if (pg < 1) break;
    pending.set(pg, wal.subarray(off + 24, off + frame));
    if (commit > 0) { for (const [k, v] of pending) pages.set(k, v); pending = new Map(); dbPages = commit; }
  }
  if (!pages.size) return db;
  const out = new Uint8Array(dbPages * pageSize);
  out.set(db.subarray(0, Math.min(db.length, out.length)));
  for (const [pg, data] of pages) if (pg <= dbPages) out.set(data, (pg - 1) * pageSize);
  return out;
}

/** Garante leitura sem modo WAL (o banco em memória não tem arquivo -wal). */
function forceRollbackJournal(db: Uint8Array): Uint8Array {
  if (db.length > 100 && db[18] === 2) { db[18] = 1; db[19] = 1; }
  return db;
}

export interface JwRow { guid: string; book: number; chapter: number; blockType: number; block: number | null; title: string | null; content: string | null; modified: string | null; tags: string | null }

export function rowToNote(r: JwRow): JwNote | null {
  if (!r.guid || r.book < 1 || r.book > 66) return null;
  const b = bookId(r.book);
  if (!Number.isInteger(r.chapter) || r.chapter < 1 || r.chapter > chaptersOf(b)) return null;
  const title = (r.title ?? "").trim().slice(0, 500);
  const text = (r.content ?? "").trim().slice(0, 20_000);
  if (!title && !text) return null;
  const verse = r.blockType === 2 && r.block && r.block > 0 && r.block < 200 ? r.block : null;
  const tags = (r.tags ?? "").split("\u001f").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  return { id: `jw-${r.guid}`.slice(0, 64), bookId: b, chapter: r.chapter, verse, title, text, tags, date: r.modified || new Date().toISOString() };
}

const QUERY_TAGS = `SELECT n.Guid, l.BookNumber, l.ChapterNumber, n.BlockType, n.BlockIdentifier, n.Title, n.Content, n.LastModified,
  (SELECT group_concat(t.Name, char(31)) FROM TagMap tm JOIN Tag t ON t.TagId = tm.TagId WHERE tm.NoteId = n.NoteId)
  FROM Note n JOIN Location l ON l.LocationId = n.LocationId
  WHERE l.BookNumber BETWEEN 1 AND 66 AND l.ChapterNumber > 0 AND lower(l.KeySymbol) LIKE 'nwt%' AND IFNULL(l.IssueTagNumber, 0) = 0`;
const QUERY_MIN = `SELECT n.Guid, l.BookNumber, l.ChapterNumber, n.BlockType, n.BlockIdentifier, n.Title, n.Content, n.LastModified, NULL
  FROM Note n JOIN Location l ON l.LocationId = n.LocationId
  WHERE l.BookNumber BETWEEN 1 AND 66 AND l.ChapterNumber > 0 AND lower(l.KeySymbol) LIKE 'nwt%'`;

export function readNotes(db: Database): JwNote[] {
  let res;
  try { res = db.exec(QUERY_TAGS); } catch { res = db.exec(QUERY_MIN); }
  const rows = res[0]?.values ?? [];
  const seen = new Set<string>();
  return rows.flatMap((v) => {
    const n = rowToNote({ guid: String(v[0] ?? ""), book: Number(v[1]), chapter: Number(v[2]), blockType: Number(v[3]),
      block: v[4] == null ? null : Number(v[4]), title: v[5] as string | null, content: v[6] as string | null,
      modified: v[7] as string | null, tags: v[8] as string | null });
    if (!n || seen.has(n.id)) return [];
    seen.add(n.id); return [n];
  }).sort((a, b) => a.bookId.localeCompare(b.bookId) || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0));
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) sqlPromise = import("sql.js").then((m) => m.default({ locateFile: () => `${import.meta.env.BASE_URL ?? "/"}sql-wasm.wasm` }));
  return sqlPromise;
}

export class JwImportError extends Error {}

export async function parseJwLibrary(file: Blob): Promise<JwNote[]> {
  if (file.size > MAX_ZIP) throw new JwImportError("too_big");
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(file); } catch { throw new JwImportError("not_zip"); }
  const manifest = zip.file("manifest.json");
  let dbName = "userData.db";
  if (manifest) { try { const m = JSON.parse(await manifest.async("string")); if (typeof m?.userDataBackup?.databaseName === "string") dbName = m.userDataBackup.databaseName; } catch { /* */ } }
  const dbEntry = zip.file(dbName) ?? zip.file("userData.db");
  if (!manifest || !dbEntry) throw new JwImportError("not_jw");
  const raw = await dbEntry.async("uint8array");
  if (raw.length > MAX_DB) throw new JwImportError("too_big");
  const walEntry = zip.file(`${dbName}-wal`);
  const wal = walEntry ? await walEntry.async("uint8array") : null;
  if (wal && wal.length > MAX_DB) throw new JwImportError("too_big");
  const bytes = forceRollbackJournal(mergeWal(raw, wal));
  const SQL = await loadSql();
  const db = new SQL.Database(bytes);
  try { return readNotes(db); } catch { throw new JwImportError("bad_db"); } finally { db.close(); }
}
