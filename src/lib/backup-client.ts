// Coleta e restauração de dados locais (IndexedDB + localStorage) para
// inclusão no backup completo. Nenhuma rede.
//
// IDB: notas de campo + pastas + bíblias (libraries + versículos)
// localStorage: configurações de leitura da Bíblia, marca-textos, biblioteca
// ativa, eventos ocultos do circuito, pasta ativa de notas, e backup auto.

import {
  type FieldNote,
  type NoteFolder,
  type BibleLibrary,
  type BibleVerseRecord,
  listAllNotesIncludingTrash,
  listAllFoldersIncludingTrash,
  listLibraries,
  saveNote,
  saveFolder,
} from "./bible-notes-store";

const DB_NAME = "visita-sc-field";
const DB_VERSION = 3;
const STORE_BIBLES = "bibles";
const STORE_LIBRARIES = "bible_libraries";

// Chaves de localStorage que entram no backup. NÃO inclui:
// - persist-cache do React Query (gerado pelo app)
// - auth do Supabase (sessão do dispositivo, não dado do usuário)
// - hidden-events específicos do dispositivo (preferência local)
const LS_BACKUP_KEYS = [
  "visita-sc:bible-view",            // bible-view-settings
  "visita-sc:bible-highlights",      // marca-textos
  "visita-sc-bible-active",          // biblioteca ativa
  "visita-sc:hidden-circuit-events", // eventos ocultos (preferência por usuário)
  "visita-sc:autobackup",            // último snapshot local
] as const;

function hasIDB(): boolean {
  try { return typeof indexedDB !== "undefined"; } catch { return false; }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore<T>(store: string): Promise<T[]> {
  if (!hasIDB()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putAllInStore<T>(store: string, items: T[]): Promise<void> {
  if (!hasIDB() || !items.length) return;
  const db = await openDB();
  const CHUNK = 1000;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const s = tx.objectStore(store);
      for (const it of slice) s.put(it);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

export interface ClientBackupDump {
  notes: FieldNote[];
  folders: NoteFolder[];
  libraries: BibleLibrary[];
  bibles: BibleVerseRecord[];     // todos os versículos, todas as libs
  localStorage: Record<string, string>;
}

export async function dumpClientBackup(
  onProgress?: (phase: string, pct: number) => void,
): Promise<ClientBackupDump> {
  onProgress?.("notes", 0);
  const notes = await listAllNotesIncludingTrash();
  onProgress?.("notes", 1);

  onProgress?.("folders", 0);
  const folders = await listAllFoldersIncludingTrash();
  onProgress?.("folders", 1);

  onProgress?.("libraries", 0);
  const libraries = await listLibraries();
  const bibles = await getAllFromStore<BibleVerseRecord>(STORE_BIBLES);
  onProgress?.("libraries", 1);

  const localStorageDump: Record<string, string> = {};
  if (typeof localStorage !== "undefined") {
    for (const key of LS_BACKUP_KEYS) {
      try {
        const v = localStorage.getItem(key);
        if (v != null) localStorageDump[key] = v;
      } catch { /* noop */ }
    }
  }

  return { notes, folders, libraries, bibles, localStorage: localStorageDump };
}

export async function restoreClientBackup(
  dump: ClientBackupDump,
  onProgress?: (phase: string, pct: number) => void,
): Promise<{ notes: number; folders: number; libraries: number; verses: number }> {
  // Notas
  onProgress?.("notes", 0);
  for (const n of dump.notes ?? []) {
    try { await saveNote(n); } catch { /* ignora item corrompido */ }
  }
  onProgress?.("notes", 1);

  // Pastas
  onProgress?.("folders", 0);
  for (const f of dump.folders ?? []) {
    if (f.id.startsWith("__fixed__")) continue; // pastas virtuais não persistem
    try { await saveFolder(f); } catch { /* ignore */ }
  }
  onProgress?.("folders", 1);

  // Bíblias (libraries + verses)
  onProgress?.("libraries", 0);
  if (hasIDB()) {
    await putAllInStore(STORE_LIBRARIES, dump.libraries ?? []);
    await putAllInStore(STORE_BIBLES, dump.bibles ?? []);
  }
  onProgress?.("libraries", 1);

  // localStorage
  if (typeof localStorage !== "undefined" && dump.localStorage) {
    for (const [k, v] of Object.entries(dump.localStorage)) {
      try { localStorage.setItem(k, v); } catch { /* quota */ }
    }
  }

  return {
    notes: dump.notes?.length ?? 0,
    folders: dump.folders?.length ?? 0,
    libraries: dump.libraries?.length ?? 0,
    verses: dump.bibles?.length ?? 0,
  };
}
