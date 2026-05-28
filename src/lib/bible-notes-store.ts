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
}

export interface FieldNote {
  id: string;
  type?: NoteType;
  folderId?: string | null;
  title: string;
  prayer?: string;
  territory?: string;
  assistants?: string;
  description?: string;
  content: string;
  created_at: number;
  updated_at: number;
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
const DB_VERSION = 2;
const STORE_NOTES = "notes";
const STORE_BIBLES = "bibles";
const STORE_LIBRARIES = "bible_libraries";

const LS_FALLBACK_KEY = "visita-sc:field-notes";
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
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: "id" });
      }
      // Recria o store de Bíblias com o novo formato (libraryId-based).
      if (db.objectStoreNames.contains(STORE_BIBLES)) {
        db.deleteObjectStore(STORE_BIBLES);
      }
      const bibles = db.createObjectStore(STORE_BIBLES, { keyPath: "key" });
      bibles.createIndex("by_library", "libraryId", { unique: false });
      bibles.createIndex("by_book", ["libraryId", "bookId"], { unique: false });

      if (!db.objectStoreNames.contains(STORE_LIBRARIES)) {
        const libs = db.createObjectStore(STORE_LIBRARIES, { keyPath: "id" });
        libs.createIndex("by_lang", "lang", { unique: false });
        libs.createIndex("by_imported_at", "imported_at", { unique: false });
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

export async function listNotes(): Promise<FieldNote[]> {
  try {
    if (hasIDB()) return await idbAll();
  } catch {
    /* fall through */
  }
  return lsAll();
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

export async function deleteNote(id: string): Promise<void> {
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

  // Grava metadados da biblioteca
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARIES, "readwrite");
    tx.objectStore(STORE_LIBRARIES).put(library);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

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
  } catch { /* noop */ }
}

export async function getActiveLibrary(): Promise<BibleLibrary | null> {
  const id = getActiveLibraryId();
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
