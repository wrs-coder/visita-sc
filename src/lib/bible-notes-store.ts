// IndexedDB wrapper for "Considerações de campo" notes + Bíblias importadas via EPUB.
// Fallback para localStorage apenas para as notas (a Bíblia exige IndexedDB pelo volume).
// 100% local — sem rede, sem Supabase.

import type { BibleLang, BookId } from "./bible-refs";
import { parseEpub, type ParseProgress, type ParsedBookInfo } from "./epub-bible-parser";

export type NoteType = "field_consideration" | "outline";

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  type: NoteType;
  created_at: number;
  /** Soft-delete (ms epoch). */
  deleted_at?: number | null;
}

export interface FieldNote {
  id: string;
  type?: NoteType;
  folderId?: string | null;
  title: string;
  event_date?: string; // YYYY-MM-DD (campo)
  period?: string;     // "morning" | "afternoon" (campo)
  prayer?: string;
  territory?: string;
  assistants?: string;
  description?: string;
  content: string;
  created_at: number;
  updated_at: number;
  /** Soft-delete (ms epoch). Purgado localmente após 30 dias. */
  deleted_at?: number | null;
  /** UUID na tabela personal_outlines do Supabase, se já sincronizado. */
  cloud_id?: string | null;
  /** True quando há mudanças locais ainda não enviadas para a nuvem. */
  dirty?: boolean;
  /** Última sincronização bem-sucedida (ms epoch). */
  synced_at?: number | null;
}


// =============================================================
// Bíblia importada via EPUB
// =============================================================

export interface BibleLibrary {
  id: string;            // uuid
  lang: string;          // ISO ("pt", "en"...)
  langLabel: string;     // "Português", "English"...
  title: string;         // título do EPUB
  identifier?: string;
  books: ParsedBookInfo[];
  bookCount: number;
  verseCount: number;
  imported_at: number;
}

export interface BibleVerseRecord {
  key: string;           // `${libraryId}:${bookId}:${chapter}:${verse}`
  libraryId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

const DB_NAME = "visita-sc-field";
const DB_VERSION = 3;
const STORE_NOTES = "notes";
const STORE_BIBLES = "bibles";
const STORE_LIBRARIES = "bible_libraries";
const STORE_FOLDERS = "note_folders";

const LS_FALLBACK_KEY = "visita-sc:field-notes";
const LS_FALLBACK_FOLDERS = "visita-sc:note-folders";
const LS_ACTIVE_LIBRARY = "visita-sc-bible-active";

function hasIDB(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion ?? 0;

      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: "id" });
      }

      // Bíblias: só recria o store quando saltamos da v<3 (formato antigo,
      // sem keyPath libraryId-based). Em bumps futuros (v3 -> v4, v4 -> v5...),
      // NÃO apagar os versículos já importados pelo usuário.
      if (oldVersion < 3) {
        if (db.objectStoreNames.contains(STORE_BIBLES)) {
          db.deleteObjectStore(STORE_BIBLES);
        }
        const bibles = db.createObjectStore(STORE_BIBLES, { keyPath: "key" });
        bibles.createIndex("by_library", "libraryId", { unique: false });
        bibles.createIndex("by_book", ["libraryId", "bookId"], { unique: false });
      } else if (!db.objectStoreNames.contains(STORE_BIBLES)) {
        const bibles = db.createObjectStore(STORE_BIBLES, { keyPath: "key" });
        bibles.createIndex("by_library", "libraryId", { unique: false });
        bibles.createIndex("by_book", ["libraryId", "bookId"], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_LIBRARIES)) {
        const libs = db.createObjectStore(STORE_LIBRARIES, { keyPath: "id" });
        libs.createIndex("by_lang", "lang", { unique: false });
        libs.createIndex("by_imported_at", "imported_at", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const folders = db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
        folders.createIndex("by_parent", "parentId", { unique: false });
        folders.createIndex("by_type", "type", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- Notas (inalterado) ----
async function idbAll(): Promise<FieldNote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, "readonly");
    const req = tx.objectStore(STORE_NOTES).getAll();
    req.onsuccess = () => resolve((req.result as FieldNote[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}


async function idbPut(note: FieldNote): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lsAll(): FieldNote[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as FieldNote[]) : [];
  } catch {
    return [];
  }
}
function lsWrite(all: FieldNote[]) {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

/** Lista todas as notas NÃO excluídas. Para a lixeira, use listTrashedNotes(). */
export async function listNotes(): Promise<FieldNote[]> {
  const all = await listAllNotesIncludingTrash();
  return all.filter((n) => n.deleted_at == null);
}

/** Inclui itens na lixeira. Usado pela tela Lixeira e pelo sync. */
export async function listAllNotesIncludingTrash(): Promise<FieldNote[]> {
  try {
    if (hasIDB()) return await idbAll();
  } catch {
    /* fall through */
  }
  return lsAll();
}

/** Apenas itens na lixeira (purga automática local de itens >30 dias). */
export async function listTrashedNotes(): Promise<FieldNote[]> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const all = await listAllNotesIncludingTrash();
  const trashed: FieldNote[] = [];
  for (const n of all) {
    if (n.deleted_at == null) continue;
    if (n.deleted_at < cutoff) {
      // Purga oportunista
      try { await hardDeleteNote(n.id); } catch { /* ignore */ }
      continue;
    }
    trashed.push(n);
  }
  return trashed.sort((a, b) => (b.deleted_at ?? 0) - (a.deleted_at ?? 0));
}

export async function saveNote(note: FieldNote): Promise<void> {
  try {
    if (hasIDB()) {
      await idbPut(note);
      return;
    }
  } catch {
    /* fall through */
  }
  const all = lsAll();
  const idx = all.findIndex((n) => n.id === note.id);
  if (idx >= 0) all[idx] = note;
  else all.push(note);
  lsWrite(all);
}

/** Soft-delete: marca a nota como excluída sem removê-la fisicamente. */
export async function deleteNote(id: string): Promise<void> {
  const all = await listAllNotesIncludingTrash();
  const note = all.find((n) => n.id === id);
  if (!note) return;
  const updated: FieldNote = { ...note, deleted_at: Date.now(), dirty: true };
  await saveNote(updated);
}

/** Restaura uma nota da lixeira. */
export async function restoreNote(id: string): Promise<void> {
  const all = await listAllNotesIncludingTrash();
  const note = all.find((n) => n.id === id);
  if (!note) return;
  const updated: FieldNote = { ...note, deleted_at: null, dirty: true, updated_at: Date.now() };
  await saveNote(updated);
}

/** Apaga DEFINITIVAMENTE do armazenamento local. */
export async function hardDeleteNote(id: string): Promise<void> {
  try {
    if (hasIDB()) {
      await idbDelete(id);
      return;
    }
  } catch {
    /* fall through */
  }
  lsWrite(lsAll().filter((n) => n.id !== id));
}

export function newNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "n-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// =============================================================
// Bibles — nova API (EPUB libraries)
// =============================================================

function libraryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "lib-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function verseKey(libId: string, bookId: string, chapter: number, verse: number): string {
  return `${libId}:${bookId}:${chapter}:${verse}`;
}

function putChunkAsync(
  store: IDBObjectStore,
  records: BibleVerseRecord[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    let last: IDBRequest | null = null;
    for (const r of records) last = store.put(r);
    if (!last) return resolve();
    last.onsuccess = () => resolve();
    last.onerror = () => reject(last!.error);
  });
}

/** Importa um EPUB para o IndexedDB. Retorna o registro da biblioteca criada. */
export async function importEpub(
  file: File,
  onProgress?: (phase: string, pct: number) => void,
): Promise<BibleLibrary> {
  const parserProgress: ParseProgress = (phase, pct) => {
    // Mapeia: unzip 0–5%, parse-opf 5–10%, index-books 10–90%
    let overall = 0;
    if (phase === "unzip") overall = pct * 0.05;
    else if (phase === "parse-opf") overall = 0.05 + pct * 0.05;
    else if (phase === "index-books") overall = 0.1 + pct * 0.8;
    onProgress?.(phase, overall);
  };

  const parsed = await parseEpub(file, parserProgress);

  const id = libraryId();
  const library: BibleLibrary = {
    id,
    lang: parsed.meta.lang,
    langLabel: parsed.meta.langLabel,
    title: parsed.meta.title,
    identifier: parsed.meta.identifier,
    books: parsed.books,
    bookCount: parsed.books.length,
    verseCount: parsed.verses.length,
    imported_at: Date.now(),
  };

  if (!hasIDB()) {
    throw new Error("IndexedDB indisponível: a importação requer armazenamento local.");
  }

  const db = await openDB();
  const CHUNK = 1000;
  const total = parsed.verses.length;

  try {
    for (let i = 0; i < total; i += CHUNK) {
      const slice = parsed.verses.slice(i, i + CHUNK);
      const records: BibleVerseRecord[] = slice.map((v) => ({
        key: verseKey(id, v.bookId, v.chapter, v.verse),
        libraryId: id,
        bookId: v.bookId,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
      }));
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_BIBLES, "readwrite");
        const store = tx.objectStore(STORE_BIBLES);
        for (const r of records) store.put(r);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      onProgress?.("write-db", 0.9 + ((i + slice.length) / Math.max(total, 1)) * 0.1);
      // Cede o thread principal entre chunks
      await new Promise((r) => setTimeout(r, 0));
    }

    // Grava metadados da biblioteca (só após todos os versículos)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LIBRARIES, "readwrite");
      tx.objectStore(STORE_LIBRARIES).put(library);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Importação falhou no meio: limpa versículos órfãos para não deixar lixo
    // invisível no IndexedDB (não há registro em bible_libraries apontando p/ eles).
    try {
      await removeLibrary(id);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }

  onProgress?.("write-db", 1);
  setActiveLibraryId(id);
  return library;
}

export async function listLibraries(): Promise<BibleLibrary[]> {
  if (!hasIDB()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARIES, "readonly");
    const req = tx.objectStore(STORE_LIBRARIES).getAll();
    req.onsuccess = () => {
      const all = (req.result as BibleLibrary[]) ?? [];
      all.sort((a, b) => b.imported_at - a.imported_at);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeLibrary(id: string): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB();
  // Apaga versículos
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readwrite");
    const store = tx.objectStore(STORE_BIBLES);
    const range = IDBKeyRange.bound(`${id}:`, `${id}:\uffff`);
    const req = store.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // Apaga registro da biblioteca
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARIES, "readwrite");
    tx.objectStore(STORE_LIBRARIES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (getActiveLibraryId() === id) {
    try { localStorage.removeItem(LS_ACTIVE_LIBRARY); } catch { /* noop */ }
  }
}

export function getActiveLibraryId(): string | null {
  try { return localStorage.getItem(LS_ACTIVE_LIBRARY); } catch { return null; }
}

export function setActiveLibraryId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LS_ACTIVE_LIBRARY, id);
    else localStorage.removeItem(LS_ACTIVE_LIBRARY);
  } catch { /* noop — Safari private mode bloqueia localStorage */ }
}

/**
 * Valida o activeLibraryId contra as bibliotecas realmente existentes.
 * Se o ID apontar para uma biblioteca removida (ou inexistente), faz fallback
 * para a primeira disponível e atualiza o localStorage. Evita o bug "versículos
 * não aparecem mais" depois que o usuário remove a lib ativa por outro caminho.
 */
export async function resolveActiveLibraryId(): Promise<string | null> {
  const libs = await listLibraries();
  if (libs.length === 0) {
    setActiveLibraryId(null);
    return null;
  }
  const current = getActiveLibraryId();
  if (current && libs.some((l) => l.id === current)) return current;
  const fallback = libs[0].id;
  setActiveLibraryId(fallback);
  return fallback;
}

export async function getActiveLibrary(): Promise<BibleLibrary | null> {
  const id = await resolveActiveLibraryId();
  if (!id) return null;
  if (!hasIDB()) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARIES, "readonly");
    const req = tx.objectStore(STORE_LIBRARIES).get(id);
    req.onsuccess = () => resolve((req.result as BibleLibrary | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getVerseFromLibrary(
  libId: string,
  bookId: string,
  chapter: number,
  verse: number,
): Promise<BibleVerseRecord | null> {
  if (!hasIDB()) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readonly");
    const req = tx.objectStore(STORE_BIBLES).get(verseKey(libId, bookId, chapter, verse));
    req.onsuccess = () => resolve((req.result as BibleVerseRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// =============================================================
// Stubs de compatibilidade (removidos na sub-etapa 3.3)
// Mantidos apenas para o código antigo (BibleManagerDialog, VersePopover)
// compilar até a migração da UI.
// =============================================================

export interface BibleLangStatus {
  lang: BibleLang;
  downloaded: boolean;
  verseCount: number;
  updated_at: number;
}

export async function getLangStatus(lang: BibleLang): Promise<BibleLangStatus> {
  return { lang, downloaded: false, verseCount: 0, updated_at: 0 };
}

export async function downloadLanguage(
  _lang: BibleLang,
  _onProgress?: (pct: number) => void,
): Promise<number> {
  throw new Error("DEPRECATED: use importEpub() — a UI será atualizada na próxima etapa.");
}

export async function removeLanguage(_lang: BibleLang): Promise<void> {
  /* no-op (UI antiga) */
}

export async function countVerses(_lang: BibleLang): Promise<number> {
  return 0;
}

export async function ensureSeed(): Promise<void> {
  /* no-op — sem seed; usuário importa o EPUB. */
}

/** Compat: tenta resolver via biblioteca ativa (ignora lang). */
export async function getVerse(
  _lang: BibleLang,
  bookId: BookId,
  chapter: number,
  verse: number,
): Promise<BibleVerseRecord | null> {
  const id = getActiveLibraryId();
  if (!id) return null;
  return getVerseFromLibrary(id, bookId as unknown as string, chapter, verse);
}

// =============================================================
// Pastas / Subpastas (NoteFolder) — IndexedDB com fallback localStorage
// =============================================================

export function newFolderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "f-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function lsFoldersAll(): NoteFolder[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_FOLDERS);
    return raw ? (JSON.parse(raw) as NoteFolder[]) : [];
  } catch {
    return [];
  }
}
function lsFoldersWrite(all: NoteFolder[]) {
  try {
    localStorage.setItem(LS_FALLBACK_FOLDERS, JSON.stringify(all));
  } catch { /* quota */ }
}

async function idbFoldersAll(): Promise<NoteFolder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, "readonly");
    const req = tx.objectStore(STORE_FOLDERS).getAll();
    req.onsuccess = () => resolve((req.result as NoteFolder[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbFolderPut(folder: NoteFolder): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, "readwrite");
    tx.objectStore(STORE_FOLDERS).put(folder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbFolderDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, "readwrite");
    tx.objectStore(STORE_FOLDERS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listAllFoldersIncludingTrash(): Promise<NoteFolder[]> {
  try {
    if (hasIDB()) return await idbFoldersAll();
  } catch { /* fallthrough */ }
  return lsFoldersAll();
}

export async function listFolders(type?: NoteType): Promise<NoteFolder[]> {
  const all = (await listAllFoldersIncludingTrash()).filter((f) => f.deleted_at == null);
  return type ? all.filter((f) => f.type === type) : all;
}

export async function listTrashedFolders(): Promise<NoteFolder[]> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const all = await listAllFoldersIncludingTrash();
  const trashed: NoteFolder[] = [];
  for (const f of all) {
    if (f.deleted_at == null) continue;
    if (f.deleted_at < cutoff) {
      try {
        if (hasIDB()) await idbFolderDelete(f.id);
        else lsFoldersWrite(lsFoldersAll().filter((x) => x.id !== f.id));
      } catch { /* ignore */ }
      continue;
    }
    trashed.push(f);
  }
  return trashed.sort((a, b) => (b.deleted_at ?? 0) - (a.deleted_at ?? 0));
}

export async function restoreFolder(id: string): Promise<void> {
  const all = await listAllFoldersIncludingTrash();
  const f = all.find((x) => x.id === id);
  if (!f) return;
  await saveFolder({ ...f, deleted_at: null });
}

export async function hardDeleteFolder(id: string): Promise<void> {
  try {
    if (hasIDB()) { await idbFolderDelete(id); return; }
  } catch { /* fallthrough */ }
  lsFoldersWrite(lsFoldersAll().filter((f) => f.id !== id));
}

export async function saveFolder(folder: NoteFolder): Promise<void> {
  try {
    if (hasIDB()) {
      await idbFolderPut(folder);
      return;
    }
  } catch { /* fallthrough */ }
  const all = lsFoldersAll();
  const idx = all.findIndex((f) => f.id === folder.id);
  if (idx >= 0) all[idx] = folder; else all.push(folder);
  lsFoldersWrite(all);
}

/** Apaga uma pasta, todas as subpastas recursivamente e todas as notas contidas. */
export async function deleteFolderCascade(id: string): Promise<void> {
  const folders = await listFolders();
  const notes = await listNotes();
  const toDeleteFolders = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (toDeleteFolders.has(cur)) continue;
    toDeleteFolders.add(cur);
    for (const f of folders) if (f.parentId === cur) stack.push(f.id);
  }
  // Apaga notas
  for (const n of notes) {
    if (n.folderId && toDeleteFolders.has(n.folderId)) {
      await deleteNote(n.id);
    }
  }
  // Apaga pastas
  for (const fid of toDeleteFolders) {
    try {
      if (hasIDB()) await idbFolderDelete(fid);
      else lsFoldersWrite(lsFoldersAll().filter((f) => f.id !== fid));
    } catch {
      lsFoldersWrite(lsFoldersAll().filter((f) => f.id !== fid));
    }
  }
}

export async function listNotesByType(
  type: NoteType,
  folderId?: string | null,
): Promise<FieldNote[]> {
  const all = await listNotes();
  return all.filter((n) => {
    const t = n.type ?? "field_consideration";
    if (t !== type) return false;
    if (folderId === undefined) return true;
    const f = n.folderId ?? null;
    return f === folderId;
  });
}

// =============================================================
// Export / Import JSON
// =============================================================

export interface FolderExportPayload {
  version: 1;
  kind: "folder";
  exported_at: number;
  folder: NoteFolder;
  subfolders: NoteFolder[];
  notes: FieldNote[];
}

export interface NoteExportPayload {
  version: 1;
  kind: "note";
  exported_at: number;
  note: FieldNote;
}

export type ExportPayload = FolderExportPayload | NoteExportPayload;

export async function exportFolderJSON(id: string): Promise<FolderExportPayload> {
  const folders = await listFolders();
  const notes = await listNotes();
  const folder = folders.find((f) => f.id === id);
  if (!folder) throw new Error("Pasta não encontrada");
  const descendants = new Set<string>([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const f of folders) {
      if (f.parentId === cur && !descendants.has(f.id)) {
        descendants.add(f.id);
        stack.push(f.id);
      }
    }
  }
  const subfolders = folders.filter((f) => descendants.has(f.id) && f.id !== id);
  const includedNotes = notes.filter((n) => n.folderId && descendants.has(n.folderId));
  return {
    version: 1,
    kind: "folder",
    exported_at: Date.now(),
    folder,
    subfolders,
    notes: includedNotes,
  };
}

export async function exportNoteJSON(id: string): Promise<NoteExportPayload> {
  const all = await listNotes();
  const note = all.find((n) => n.id === id);
  if (!note) throw new Error("Nota não encontrada");
  return { version: 1, kind: "note", exported_at: Date.now(), note };
}

/**
 * Importa um payload JSON recriando pastas/notas com novos IDs. Se for um
 * payload de pasta, a pasta raiz é criada sob `targetParentId` (ou raiz),
 * e a hierarquia interna é preservada.
 * Retorna o número de pastas e notas criadas.
 */
export async function importJSON(
  payload: ExportPayload,
  targetParentId: string | null = null,
): Promise<{ folders: number; notes: number }> {
  if (!payload || typeof payload !== "object" || payload.version !== 1) {
    throw new Error("Arquivo JSON inválido ou versão incompatível.");
  }
  const now = Date.now();
  if (payload.kind === "note") {
    const oldNote = payload.note;
    const newNote: FieldNote = {
      ...oldNote,
      id: newNoteId(),
      folderId: targetParentId,
      type: oldNote.type ?? "field_consideration",
      created_at: now,
      updated_at: now,
    };
    await saveNote(newNote);
    return { folders: 0, notes: 1 };
  }
  if (payload.kind === "folder") {
    // Mapeia oldId -> newId
    const idMap = new Map<string, string>();
    const root = payload.folder;
    const rootNewId = newFolderId();
    idMap.set(root.id, rootNewId);
    await saveFolder({
      id: rootNewId,
      name: root.name,
      parentId: targetParentId,
      type: root.type,
      created_at: now,
    });
    // Sub-pastas: cria em qualquer ordem porque mapeamos depois
    // (precisamos garantir parent já criado: ordenar topologicamente)
    const remaining = [...payload.subfolders];
    let safety = remaining.length * 2 + 10;
    while (remaining.length && safety-- > 0) {
      for (let i = 0; i < remaining.length; i++) {
        const f = remaining[i];
        const parentMapped = f.parentId ? idMap.get(f.parentId) : rootNewId;
        if (f.parentId === null) {
          // pasta órfã: anexa à raiz importada
          const nid = newFolderId();
          idMap.set(f.id, nid);
          await saveFolder({ id: nid, name: f.name, parentId: rootNewId, type: f.type, created_at: now });
          remaining.splice(i, 1);
          break;
        }
        if (parentMapped) {
          const nid = newFolderId();
          idMap.set(f.id, nid);
          await saveFolder({ id: nid, name: f.name, parentId: parentMapped, type: f.type, created_at: now });
          remaining.splice(i, 1);
          break;
        }
      }
    }
    // Notas
    for (const n of payload.notes) {
      const folderNew = n.folderId ? (idMap.get(n.folderId) ?? rootNewId) : rootNewId;
      await saveNote({
        ...n,
        id: newNoteId(),
        folderId: folderNew,
        type: n.type ?? root.type,
        created_at: now,
        updated_at: now,
      });
    }
    return { folders: 1 + payload.subfolders.length, notes: payload.notes.length };
  }
  throw new Error("Tipo de payload desconhecido.");
}

