// IndexedDB wrapper for "Considerações de campo" notes + bibles.
// Falls back to localStorage if IndexedDB is unavailable (rare; private mode etc.).
// 100% local — no network, no Supabase.

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
