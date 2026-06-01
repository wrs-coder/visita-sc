// Hook de sincronização cloud↔local para esboços pessoais.
// - Baixa esboços da nuvem ao logar (overwrite por LWW).
// - Empurra esboços locais sem cloud_id (migração one-shot).
// - Reconcilia exclusões: itens com cloud_id que sumiram da nuvem → soft-delete local.

import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listFolders,
  listAllNotesIncludingTrash,
  saveFolder,
  saveNote,
  newNoteId,
  newFolderId,
  type NoteFolder,
  type FieldNote,
} from "@/lib/bible-notes-store";
import {
  listCloudOutlineTree,
  replaceCloudOutlineTree,
} from "@/lib/personal-outlines.functions";

const LAST_SYNC_KEY = "visita-sc:outlines-last-sync";
const PATH_SEPARATOR = " / ";

function isOutline(n: FieldNote): boolean {
  return (n.type ?? "field_consideration") === "outline";
}

function contentOf(n: FieldNote) {
  return {
    prayer: n.prayer ?? null,
    territory: n.territory ?? null,
    assistants: n.assistants ?? null,
    description: n.description ?? null,
    content: n.content ?? "",
  };
}

function isFolderMarker(row: { content_json: unknown }): boolean {
  const content = row.content_json;
  return !!content && typeof content === "object" && (content as Record<string, unknown>).kind === "folder";
}

function folderPath(folderId: string | null | undefined, folders: NoteFolder[]): string {
  if (!folderId) return "";
  const byId = new Map(folders.map((f) => [f.id, f]));
  const names: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(folderId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name.trim());
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return names.filter(Boolean).join(PATH_SEPARATOR).slice(0, 500);
}

function splitPath(path: string): string[] {
  return path.split(PATH_SEPARATOR).map((p) => p.trim()).filter(Boolean);
}

async function ensureFolderPath(path: string, folders: NoteFolder[], preferredId?: string | null): Promise<string | null> {
  const parts = splitPath(path);
  if (parts.length === 0) return null;
  let parentId: string | null = null;
  let currentId: string | null = null;
  const mutable = folders;
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    const existing = mutable.find((f) => f.type === "outline" && (f.parentId ?? null) === parentId && f.name === name);
    if (existing) {
      currentId = existing.id;
      parentId = existing.id;
      continue;
    }
    const id = i === parts.length - 1 && preferredId ? preferredId : newFolderId();
    const folder: NoteFolder = { id, name, parentId, type: "outline", created_at: Date.now(), deleted_at: null };
    await saveFolder(folder);
    mutable.push(folder);
    currentId = id;
    parentId = id;
  }
  return currentId;
}

export function useOutlinesSync() {
  const { user } = useAuth();
  const fnList = useServerFn(listCloudOutlineTree);
  const fnReplace = useServerFn(replaceCloudOutlineTree);
  const ran = useRef(false);

  const syncNow = useCallback(async () => {
    if (!user) return { ok: false as const, error: "not-authenticated" };
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false as const, error: "offline" };

    const cloud = await fnList();
    if (!cloud.ok) return cloud;

    const [localFolders, localAll] = await Promise.all([listFolders("outline"), listAllNotesIncludingTrash()]);
    const localOutlines = localAll.filter(isOutline);
    const cloudFolders = cloud.folders.filter(isFolderMarker);
    const cloudOutlines = cloud.outlines.filter((row) => !isFolderMarker(row));

    const foldersByCloudId = new Map<string, NoteFolder>();
    for (const folder of localFolders) {
      const match = cloudFolders.find((row) => row.folder_path === folderPath(folder.id, localFolders));
      if (match) foldersByCloudId.set(match.id, folder);
    }

    const mutableFolders = [...localFolders];
    for (const folderRow of cloudFolders) {
      const deleted = folderRow.deleted_at ? new Date(folderRow.deleted_at).getTime() : null;
      const existing = foldersByCloudId.get(folderRow.id);
      if (existing) {
        await saveFolder({ ...existing, name: folderRow.title, deleted_at: deleted });
        continue;
      }
      await ensureFolderPath(folderRow.folder_path || folderRow.title, mutableFolders);
    }

    const byCloudId = new Map<string, FieldNote>();
    for (const note of localOutlines) if (note.cloud_id) byCloudId.set(note.cloud_id, note);

    for (const row of cloudOutlines) {
      const cTime = new Date(row.updated_at).getTime();
      const cj = (row.content_json ?? {}) as Record<string, unknown>;
      const folderId = await ensureFolderPath(row.folder_path, mutableFolders);
      const existing = byCloudId.get(row.id);
      const deletedAt = row.deleted_at ? new Date(row.deleted_at).getTime() : null;
      const base = {
        type: "outline" as const,
        folderId,
        title: row.title,
        prayer: typeof cj.prayer === "string" ? cj.prayer : "",
        territory: typeof cj.territory === "string" ? cj.territory : "",
        assistants: typeof cj.assistants === "string" ? cj.assistants : "",
        description: typeof cj.description === "string" ? cj.description : "",
        content: typeof cj.content === "string" ? cj.content : "",
        updated_at: cTime,
        cloud_id: row.id,
        synced_at: Date.now(),
        dirty: false,
        deleted_at: deletedAt,
      };
      if (!existing) {
        await saveNote({ ...base, id: newNoteId(), created_at: new Date(row.created_at).getTime() });
      } else if (!existing.dirty && cTime > existing.updated_at) {
        await saveNote({ ...existing, ...base });
      }
    }

    const latestFolders = await listFolders("outline");
    const latestOutlines = (await listAllNotesIncludingTrash()).filter(isOutline);
    const pushed = await fnReplace({
      data: {
        folders: latestFolders.map((folder) => ({
          local_id: folder.id,
          title: folder.name || "Pasta",
          folder_path: folderPath(folder.id, latestFolders) || folder.name || "Pasta",
          deleted_at: folder.deleted_at ? new Date(folder.deleted_at).toISOString() : null,
        })),
        outlines: latestOutlines
          .filter((note) => (note.title?.trim()?.length ?? 0) > 0 || (note.content?.trim()?.length ?? 0) > 0)
          .map((note) => ({
            local_id: note.id,
            title: (note.title || "Sem título").slice(0, 200),
            folder_path: folderPath(note.folderId, latestFolders),
            content: contentOf(note),
            deleted_at: note.deleted_at ? new Date(note.deleted_at).toISOString() : null,
          })),
      },
    });
    if (!pushed.ok) return pushed;

    const remoteByLocalId = new Map<string, string>();
    for (const row of pushed.outlines) {
      const content = (row.content_json ?? {}) as Record<string, unknown>;
      if (typeof content.local_id === "string") remoteByLocalId.set(content.local_id, row.id);
    }
    for (const note of latestOutlines) {
      const cloudId = remoteByLocalId.get(note.id);
      if (cloudId) await saveNote({ ...note, cloud_id: cloudId, dirty: false, synced_at: Date.now() });
    }
    try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* noop */ }
    return { ok: true as const };
  }, [user, fnList, fnReplace]);

  useEffect(() => {
    if (!user || ran.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    ran.current = true;
    syncNow().catch((err) => console.warn("[useOutlinesSync] sync failed", err));
  }, [user, syncNow]);

  return syncNow;
}
