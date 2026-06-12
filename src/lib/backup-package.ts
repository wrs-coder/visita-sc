// Empacotamento e desempacotamento do backup completo em arquivo .zip.
//
// Onda 7.11 — Missão 01: cobertura total.
//
// Estrutura v3 (atual):
//   manifest.json                          { type, version: 3, exportedAt, app }
//   server.json                            { payload do exportFullBackup }
//   client/local.json                      { localStorage scan total }
//   client/indexeddb/<storeName>.json      { linhas do store }
//   client/indexeddb/bibles/<libraryId>.json   { BibleVerseRecord[] por biblioteca }
//
// Compatibilidade: lê v2 também — ver `unpackBackupZip`.

import JSZip from "jszip";
import type { ClientBackupDump } from "./backup-client";
import type { BibleVerseRecord, BibleLibrary, FieldNote, NoteFolder } from "./bible-notes-store";

export interface BackupManifest {
  type: "visita_sc_backup_zip";
  version: 2 | 3;
  exportedAt: string;
  app: "visita-sc";
}

export interface FullBackup {
  manifest: BackupManifest;
  server: unknown;        // payload do exportFullBackup
  client: ClientBackupDump;
}

const HIGH_COMPRESSION = { compression: "DEFLATE" as const, compressionOptions: { level: 9 } };

export async function packBackupZip(full: FullBackup): Promise<Blob> {
  const zip = new JSZip();

  zip.file("manifest.json", JSON.stringify(full.manifest, null, 2));
  zip.file("server.json", JSON.stringify(full.server));
  zip.file("client/local.json", JSON.stringify(full.client.localStorage));

  // Garante mapa genérico mesmo em dumps mais antigos em memória.
  const idb = full.client.indexedDB ?? {
    notes: full.client.notes,
    note_folders: full.client.folders,
    bible_libraries: full.client.libraries,
    bibles: full.client.bibles,
  };

  for (const [store, rows] of Object.entries(idb)) {
    if (store === "bibles") {
      // Split por biblioteca — textos bíblicos são MUITO repetitivos e
      // dominam o tamanho do .zip; compactar nível 9 reduz ~20% sem custo
      // perceptível no pack/unpack.
      const byLib = new Map<string, BibleVerseRecord[]>();
      for (const v of rows as BibleVerseRecord[]) {
        const libId = v?.libraryId ?? "_orphan";
        let arr = byLib.get(libId);
        if (!arr) { arr = []; byLib.set(libId, arr); }
        arr.push(v);
      }
      for (const [libId, verses] of byLib) {
        zip.file(`client/indexeddb/bibles/${libId}.json`, JSON.stringify(verses), HIGH_COMPRESSION);
      }
      continue;
    }
    zip.file(`client/indexeddb/${store}.json`, JSON.stringify(rows ?? []));
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function unpackBackupZip(file: File): Promise<FullBackup> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const read = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw new Error(`Arquivo ausente no .zip: ${path}`);
    return entry.async("string");
  };
  const tryRead = async (path: string) => {
    const entry = zip.file(path);
    return entry ? entry.async("string") : null;
  };

  const manifest = JSON.parse(await read("manifest.json")) as BackupManifest;
  if (manifest.type !== "visita_sc_backup_zip") {
    throw new Error("Arquivo .zip não é um backup do Visita SC.");
  }

  const server = JSON.parse(await read("server.json"));
  const local = JSON.parse((await tryRead("client/local.json")) ?? "{}") as Record<string, string>;

  // Tenta o layout v3 primeiro (genérico). Cai para v2 se nada bater.
  const indexedDB: Record<string, unknown[]> = {};
  const tasks: Promise<void>[] = [];
  zip.folder("client/indexeddb")?.forEach((relativePath, entry) => {
    if (entry.dir) return;
    // ignora subpasta /bibles/ aqui — tratada separadamente
    if (relativePath.startsWith("bibles/")) return;
    if (!relativePath.endsWith(".json")) return;
    const storeName = relativePath.slice(0, -".json".length);
    tasks.push(
      entry.async("string").then((txt) => {
        try { indexedDB[storeName] = JSON.parse(txt) as unknown[]; }
        catch { indexedDB[storeName] = []; }
      }),
    );
  });

  // Bíblias (split por library) — sempre concatena em `bibles`
  const bibles: BibleVerseRecord[] = [];
  zip.folder("client/indexeddb/bibles")?.forEach((_p, entry) => {
    if (entry.dir) return;
    tasks.push(
      entry.async("string").then((txt) => {
        try {
          for (const v of JSON.parse(txt) as BibleVerseRecord[]) bibles.push(v);
        } catch { /* corrupted lib */ }
      }),
    );
  });
  await Promise.all(tasks);
  if (bibles.length) indexedDB.bibles = bibles;

  // === Retro-compat v2 (client/notes.json etc.) ===
  let notes: FieldNote[] = (indexedDB.notes as FieldNote[]) ?? [];
  let folders: NoteFolder[] = (indexedDB.note_folders as NoteFolder[]) ?? [];
  let libraries: BibleLibrary[] = (indexedDB.bible_libraries as BibleLibrary[]) ?? [];
  let v2Bibles: BibleVerseRecord[] = bibles;

  if (Object.keys(indexedDB).length === 0) {
    notes = JSON.parse((await tryRead("client/notes.json")) ?? "[]");
    folders = JSON.parse((await tryRead("client/folders.json")) ?? "[]");
    libraries = JSON.parse((await tryRead("client/libraries.json")) ?? "[]");
    const v2 = zip.folder("client/bibles");
    if (v2) {
      const t2: Promise<void>[] = [];
      v2.forEach((_r, entry) => {
        if (entry.dir) return;
        t2.push(entry.async("string").then((txt) => {
          try { for (const v of JSON.parse(txt) as BibleVerseRecord[]) v2Bibles.push(v); }
          catch { /* ignore */ }
        }));
      });
      await Promise.all(t2);
    }
    // Espelha legacy também no mapa genérico para o restaurador único.
    indexedDB.notes = notes;
    indexedDB.note_folders = folders;
    indexedDB.bible_libraries = libraries;
    if (v2Bibles.length) indexedDB.bibles = v2Bibles;
  }

  return {
    manifest,
    server,
    client: {
      indexedDB,
      localStorage: local,
      notes,
      folders,
      libraries,
      bibles: v2Bibles,
    },
  };
}

/** Detecta se um File parece um .json legado (v1) ou um .zip novo (v2/v3). */
export function looksLikeZip(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) return true;
  if (name.endsWith(".json")) return false;
  return file.type === "application/zip" || file.type === "application/x-zip-compressed";
}
