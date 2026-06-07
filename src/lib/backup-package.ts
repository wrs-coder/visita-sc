// Empacotamento e desempacotamento do backup completo em arquivo .zip.
//
// Estrutura:
//   manifest.json       { type, version, exportedAt, app }
//   server.json         { payload do exportFullBackup }
//   client/local.json   { localStorage filtrado }
//   client/notes.json   { FieldNote[] }
//   client/folders.json { NoteFolder[] }
//   client/libraries.json
//   client/bibles/<libraryId>.json   { BibleVerseRecord[] por biblioteca }

import JSZip from "jszip";
import type { ClientBackupDump } from "./backup-client";
import type { BibleVerseRecord } from "./bible-notes-store";

export interface BackupManifest {
  type: "visita_sc_backup_zip";
  version: 2;
  exportedAt: string;
  app: "visita-sc";
}

export interface FullBackup {
  manifest: BackupManifest;
  server: unknown;        // payload do exportFullBackup
  client: ClientBackupDump;
}

export async function packBackupZip(full: FullBackup): Promise<Blob> {
  const zip = new JSZip();

  zip.file("manifest.json", JSON.stringify(full.manifest, null, 2));
  zip.file("server.json", JSON.stringify(full.server));
  zip.file("client/local.json", JSON.stringify(full.client.localStorage));
  zip.file("client/notes.json", JSON.stringify(full.client.notes));
  zip.file("client/folders.json", JSON.stringify(full.client.folders));
  zip.file("client/libraries.json", JSON.stringify(full.client.libraries));

  // Agrupa versículos por libraryId — um arquivo por bíblia (melhor compressão e menor pico de memória).
  const byLib = new Map<string, BibleVerseRecord[]>();
  for (const v of full.client.bibles) {
    let arr = byLib.get(v.libraryId);
    if (!arr) { arr = []; byLib.set(v.libraryId, arr); }
    arr.push(v);
  }
  for (const [libId, verses] of byLib) {
    zip.file(`client/bibles/${libId}.json`, JSON.stringify(verses));
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
  const local = JSON.parse((await tryRead("client/local.json")) ?? "{}");
  const notes = JSON.parse((await tryRead("client/notes.json")) ?? "[]");
  const folders = JSON.parse((await tryRead("client/folders.json")) ?? "[]");
  const libraries = JSON.parse((await tryRead("client/libraries.json")) ?? "[]");

  const bibles: BibleVerseRecord[] = [];
  const bibleFiles = zip.folder("client/bibles");
  if (bibleFiles) {
    const tasks: Promise<void>[] = [];
    bibleFiles.forEach((_relativePath, entry) => {
      if (entry.dir) return;
      tasks.push(
        entry.async("string").then((txt) => {
          const arr = JSON.parse(txt) as BibleVerseRecord[];
          for (const v of arr) bibles.push(v);
        }),
      );
    });
    await Promise.all(tasks);
  }

  return {
    manifest,
    server,
    client: { localStorage: local, notes, folders, libraries, bibles },
  };
}

/** Detecta se um File parece um .json legado (v1) ou um .zip novo (v2). */
export function looksLikeZip(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) return true;
  if (name.endsWith(".json")) return false;
  // fallback por mime
  return file.type === "application/zip" || file.type === "application/x-zip-compressed";
}
