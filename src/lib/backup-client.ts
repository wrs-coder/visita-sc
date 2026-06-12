// Coleta e restauração TOTAL de dados locais (IndexedDB + localStorage).
//
// Onda 7.11 — Missão 01: cobertura absoluta.
//   • IndexedDB: itera TODOS os object stores da base "visita-sc-field"
//     de forma genérica (notas, pastas, bíblias, libraries — e qualquer
//     store novo adicionado no futuro entra automaticamente).
//   • localStorage: scan total das chaves, excluindo APENAS as que são
//     específicas do dispositivo/sessão (auth do Supabase, gates de
//     warm-up, cache regenerável do React Query).
//
// Compatibilidade: backups antigos (v2) continuam restaurando — os
// campos legacy `notes/folders/libraries/bibles` são derivados do mapa
// `indexedDB` no dump novo, e na restauração preferimos o mapa genérico
// quando presente.

import {
  type FieldNote,
  type NoteFolder,
  type BibleLibrary,
  type BibleVerseRecord,
  listAllNotesIncludingTrash,
  listAllFoldersIncludingTrash,
  listLibraries,
} from "./bible-notes-store";

const DB_NAME = "visita-sc-field";
const DB_VERSION = 3;

// Stores legados — preenchidos para retro-compatibilidade. NÃO usar como
// fonte da verdade no novo dump; o mapa genérico `indexedDB` é canônico.
const STORE_NOTES = "notes";
const STORE_FOLDERS = "note_folders";
const STORE_LIBRARIES = "bible_libraries";
const STORE_BIBLES = "bibles";

// Chaves de localStorage que NÃO entram no backup. Tudo o resto é incluído.
// Excluímos apenas o que é específico de dispositivo/sessão ou regenerável.
const LS_EXCLUDE_EXACT = new Set<string>([
  "visita-sc:logout-intent",
  "visita-sc:warmup-session",
  "visita-sc:last-warmup",
  "visita-sc:offline-ready",
  "visita-sc-rq-cache",          // persist do React Query (regenerável)
  "undefined",
]);
function lsExcluded(key: string): boolean {
  if (LS_EXCLUDE_EXACT.has(key)) return true;
  if (key.startsWith("sb-")) return true;             // Supabase auth/session
  if (key.startsWith("visita-sc:rq:")) return true;   // fallback do persister
  return false;
}

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

async function getAllFromStore<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putAllInStore(db: IDBDatabase, store: string, items: unknown[]): Promise<void> {
  if (!items.length) return;
  const CHUNK = 1000;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const s = tx.objectStore(store);
      for (const it of slice) {
        try { s.put(it as IDBValidKey extends never ? never : never); } catch { /* skip bad row */ }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

/** Dump genérico: TODOS os object stores da base local. */
async function dumpAllIndexedDB(): Promise<Record<string, unknown[]>> {
  if (!hasIDB()) return {};
  const db = await openDB();
  const out: Record<string, unknown[]> = {};
  const names = Array.from(db.objectStoreNames);
  for (const name of names) {
    try { out[name] = await getAllFromStore(db, name); }
    catch { out[name] = []; }
  }
  return out;
}

/** Restaura cada store presente no dump. Stores desconhecidos são ignorados. */
async function restoreAllIndexedDB(map: Record<string, unknown[]>): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB();
  const known = new Set(Array.from(db.objectStoreNames));
  for (const [name, rows] of Object.entries(map)) {
    if (!known.has(name)) continue; // store removido em versão futura
    try { await putAllInStore(db, name, rows ?? []); }
    catch { /* item inválido — segue */ }
  }
}

/** Scan total do localStorage com exclusões mínimas. */
function dumpLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof localStorage === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || lsExcluded(k)) continue;
    try {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    } catch { /* noop */ }
  }
  return out;
}

export interface ClientBackupDump {
  // === v3 (canônico) ===
  /** Mapa genérico storeName → linhas. Cobre todos os object stores. */
  indexedDB?: Record<string, unknown[]>;
  /** Dump completo do localStorage (exceto chaves de sessão/cache). */
  localStorage: Record<string, string>;

  // === v2 (legacy, retro-compat na leitura) ===
  notes: FieldNote[];
  folders: NoteFolder[];
  libraries: BibleLibrary[];
  bibles: BibleVerseRecord[];
}

export async function dumpClientBackup(
  onProgress?: (phase: string, pct: number) => void,
): Promise<ClientBackupDump> {
  onProgress?.("indexeddb", 0);
  const idb = await dumpAllIndexedDB();
  onProgress?.("indexeddb", 1);

  onProgress?.("localStorage", 0);
  const ls = dumpLocalStorage();
  onProgress?.("localStorage", 1);

  // Espelha campos legacy a partir do mapa genérico (não duplica dado em
  // disco — só na serialização do .zip). Mantém leitores antigos felizes.
  const notes = (idb[STORE_NOTES] as FieldNote[] | undefined) ?? [];
  const folders = (idb[STORE_FOLDERS] as NoteFolder[] | undefined) ?? [];
  const libraries = (idb[STORE_LIBRARIES] as BibleLibrary[] | undefined) ?? [];
  const bibles = (idb[STORE_BIBLES] as BibleVerseRecord[] | undefined) ?? [];

  // Fallback: se o IDB não estiver disponível, tenta as APIs públicas
  // (que caem para localStorage internamente).
  if (!hasIDB()) {
    return {
      indexedDB: {},
      localStorage: ls,
      notes: await listAllNotesIncludingTrash(),
      folders: await listAllFoldersIncludingTrash(),
      libraries: await listLibraries(),
      bibles: [],
    };
  }

  return { indexedDB: idb, localStorage: ls, notes, folders, libraries, bibles };
}

export async function restoreClientBackup(
  dump: ClientBackupDump,
  onProgress?: (phase: string, pct: number) => void,
): Promise<{ notes: number; folders: number; libraries: number; verses: number; stores: number; lsKeys: number }> {
  onProgress?.("indexeddb", 0);

  // Caminho preferido: mapa genérico (cobre todos os stores).
  let idbMap = dump.indexedDB;

  // Retro-compat: se for um dump v2 (sem `indexedDB`), reconstrói o mapa
  // a partir dos campos legacy para reaproveitar o mesmo restaurador.
  if (!idbMap || Object.keys(idbMap).length === 0) {
    idbMap = {
      [STORE_NOTES]: (dump.notes ?? []).filter(Boolean),
      [STORE_FOLDERS]: (dump.folders ?? []).filter(
        // pastas fixas virtuais nunca persistem
        (f) => !!f && typeof f.id === "string" && !f.id.startsWith("__fixed__"),
      ),
      [STORE_LIBRARIES]: dump.libraries ?? [],
      [STORE_BIBLES]: dump.bibles ?? [],
    };
  } else {
    // Limpa pastas fixas virtuais que tenham vazado em dumps anteriores.
    const folders = (idbMap[STORE_FOLDERS] as NoteFolder[] | undefined);
    if (folders?.length) {
      idbMap[STORE_FOLDERS] = folders.filter(
        (f) => !!f && typeof f.id === "string" && !f.id.startsWith("__fixed__"),
      );
    }
  }

  await restoreAllIndexedDB(idbMap);
  onProgress?.("indexeddb", 1);

  let lsKeys = 0;
  if (typeof localStorage !== "undefined" && dump.localStorage) {
    for (const [k, v] of Object.entries(dump.localStorage)) {
      if (lsExcluded(k)) continue; // nunca sobrescreve sessão local
      try { localStorage.setItem(k, v); lsKeys++; } catch { /* quota */ }
    }
  }

  return {
    notes: (idbMap[STORE_NOTES]?.length ?? 0),
    folders: (idbMap[STORE_FOLDERS]?.length ?? 0),
    libraries: (idbMap[STORE_LIBRARIES]?.length ?? 0),
    verses: (idbMap[STORE_BIBLES]?.length ?? 0),
    stores: Object.keys(idbMap).length,
    lsKeys,
  };
}
