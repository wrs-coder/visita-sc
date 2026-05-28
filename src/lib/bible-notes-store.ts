// IndexedDB wrapper for "Considerações de campo" notes + bibles.
// Falls back to localStorage if IndexedDB is unavailable (rare; private mode etc.).
// 100% local — no network, no Supabase.

import type { BibleLang, BookId } from "./bible-refs";
import { BIBLE_SEED } from "./bible-seed";

export interface FieldNote {
  id: string;
  title: string;
  prayer: string;
  territory: string;
  assistants: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface BibleVerseRecord {
  key: string; // `${lang}:${bookId}:${chapter}:${verse}`
  lang: BibleLang;
  bookId: BookId;
  chapter: number;
  verse: number;
  text: string;
}

const DB_NAME = "visita-sc-field";
const DB_VERSION = 1;
const STORE_NOTES = "notes";
const STORE_BIBLES = "bibles"; // reserved for Etapa 3

const LS_FALLBACK_KEY = "visita-sc:field-notes";

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
      if (!db.objectStoreNames.contains(STORE_BIBLES)) {
        db.createObjectStore(STORE_BIBLES, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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

// ---- localStorage fallback ----
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

// ---- Public API ----
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
// Bíblia offline
// =============================================================

const LS_BIBLES_KEY = "visita-sc:bibles";
const LS_LANG_STATUS_KEY = "visita-sc:bible-lang-status";

export interface BibleLangStatus {
  lang: BibleLang;
  downloaded: boolean;
  verseCount: number;
  updated_at: number;
}

function verseKey(lang: BibleLang, bookId: BookId, chapter: number, verse: number): string {
  return `${lang}:${bookId}:${chapter}:${verse}`;
}

async function idbPutVerses(records: BibleVerseRecord[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readwrite");
    const store = tx.objectStore(STORE_BIBLES);
    for (const r of records) store.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetVerse(key: string): Promise<BibleVerseRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readonly");
    const req = tx.objectStore(STORE_BIBLES).get(key);
    req.onsuccess = () => resolve((req.result as BibleVerseRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbCountVerses(lang: BibleLang): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readonly");
    const req = tx.objectStore(STORE_BIBLES).getAllKeys();
    req.onsuccess = () => {
      const keys = (req.result as string[]) ?? [];
      resolve(keys.filter((k) => k.startsWith(`${lang}:`)).length);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteLang(lang: BibleLang): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BIBLES, "readwrite");
    const store = tx.objectStore(STORE_BIBLES);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = (req.result as string[]) ?? [];
      for (const k of keys) if (k.startsWith(`${lang}:`)) store.delete(k);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- localStorage fallback for bibles ----
function lsBibles(): Record<string, BibleVerseRecord> {
  try {
    const raw = localStorage.getItem(LS_BIBLES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BibleVerseRecord>) : {};
  } catch {
    return {};
  }
}
function lsWriteBibles(all: Record<string, BibleVerseRecord>) {
  try {
    localStorage.setItem(LS_BIBLES_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

// ---- Public API ----

export async function getVerse(
  lang: BibleLang,
  bookId: BookId,
  chapter: number,
  verse: number,
): Promise<BibleVerseRecord | null> {
  const k = verseKey(lang, bookId, chapter, verse);
  try {
    if (hasIDB()) return await idbGetVerse(k);
  } catch {
    /* fall through */
  }
  return lsBibles()[k] ?? null;
}

/** Conta versículos disponíveis para um idioma. */
export async function countVerses(lang: BibleLang): Promise<number> {
  try {
    if (hasIDB()) return await idbCountVerses(lang);
  } catch {
    /* fall through */
  }
  return Object.keys(lsBibles()).filter((k) => k.startsWith(`${lang}:`)).length;
}

/**
 * "Baixa" o idioma — nesta versão, expande a seed local (offline-first).
 * O onProgress (0..1) é chamado para alimentar a barra de progresso da UI.
 */
export async function downloadLanguage(
  lang: BibleLang,
  onProgress?: (pct: number) => void,
): Promise<number> {
  const seed = BIBLE_SEED[lang] ?? [];
  const records: BibleVerseRecord[] = seed.map((v) => ({
    key: verseKey(lang, v.bookId, v.chapter, v.verse),
    lang,
    bookId: v.bookId,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
  }));

  // Progresso simulado em etapas curtas (mantém UX consistente em <1s).
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 80));
    onProgress?.(i / steps);
  }

  try {
    if (hasIDB()) {
      await idbPutVerses(records);
    } else {
      const all = lsBibles();
      for (const r of records) all[r.key] = r;
      lsWriteBibles(all);
    }
  } catch {
    const all = lsBibles();
    for (const r of records) all[r.key] = r;
    lsWriteBibles(all);
  }

  markLangDownloaded(lang, records.length);
  return records.length;
}

export async function removeLanguage(lang: BibleLang): Promise<void> {
  try {
    if (hasIDB()) await idbDeleteLang(lang);
  } catch {
    /* fall through */
  }
  const all = lsBibles();
  for (const k of Object.keys(all)) if (k.startsWith(`${lang}:`)) delete all[k];
  lsWriteBibles(all);
  unmarkLang(lang);
}

function getLangStatusMap(): Record<BibleLang, BibleLangStatus> {
  try {
    const raw = localStorage.getItem(LS_LANG_STATUS_KEY);
    if (raw) return JSON.parse(raw) as Record<BibleLang, BibleLangStatus>;
  } catch {
    /* noop */
  }
  return {} as Record<BibleLang, BibleLangStatus>;
}
function setLangStatusMap(m: Record<BibleLang, BibleLangStatus>) {
  try {
    localStorage.setItem(LS_LANG_STATUS_KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
}
function markLangDownloaded(lang: BibleLang, count: number) {
  const m = getLangStatusMap();
  m[lang] = { lang, downloaded: true, verseCount: count, updated_at: Date.now() };
  setLangStatusMap(m);
}
function unmarkLang(lang: BibleLang) {
  const m = getLangStatusMap();
  delete m[lang];
  setLangStatusMap(m);
}

export async function getLangStatus(lang: BibleLang): Promise<BibleLangStatus> {
  const m = getLangStatusMap();
  const stored = m[lang];
  const count = await countVerses(lang);
  if (stored && count === stored.verseCount) return stored;
  // Reconcilia (ex.: idioma seedado mas sem flag).
  return {
    lang,
    downloaded: count > 0,
    verseCount: count,
    updated_at: stored?.updated_at ?? 0,
  };
}

/** Garante que cada idioma tenha pelo menos a seed disponível (executado uma vez). */
export async function ensureSeed(): Promise<void> {
  for (const lang of ["pt", "en", "es"] as BibleLang[]) {
    const c = await countVerses(lang);
    if (c === 0) {
      // Aplica seed silenciosamente (sem progresso) — primeira execução.
      await downloadLanguage(lang);
    }
  }
}
