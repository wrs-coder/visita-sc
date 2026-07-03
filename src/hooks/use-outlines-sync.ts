// Hook de sincronização cloud↔local para esboços pessoais E considerações de campo.
// Estratégia: a tabela personal_outlines no Supabase guarda ambos os tipos.
// - Notas: content_json.note_type ∈ {"outline", "field_consideration"} (default "outline" p/ legado).
// - Pastas: content_json = { kind: "folder", folder_type, local_id } — folder_type idem (default "outline").
// LWW por updated_at.

import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listFolders,
  listAllNotesIncludingTrash,
  saveFolder,
  saveNote,
  newNoteId,
  newFolderId,
  isFixedFolder,
  FIXED_FOLDER_WEEK_OUTLINES,
  FIXED_FOLDER_WEEK_CONSIDERATIONS,
  type NoteFolder,
  type FieldNote,
  type NoteType,
} from "@/lib/bible-notes-store";
import {
  listCloudOutlineTree,
  replaceCloudOutlineTree,
} from "@/lib/personal-outlines.functions";

const FIXED_OUTLINE_SENTINEL = "__fixed__week-outlines";
const FIXED_FIELD_SENTINEL = "__fixed__week-considerations";

const LAST_SYNC_KEY = "visita-sc:outlines-last-sync";
const PATH_SEPARATOR = " / ";

function typeOfNote(n: FieldNote): NoteType {
  return (n.type ?? "field_consideration") as NoteType;
}

function typeFromRow(row: { content_json: unknown }, key: "note_type" | "folder_type"): NoteType {
  const cj = row.content_json as Record<string, unknown> | null | undefined;
  const v = cj?.[key];
  return v === "field_consideration" ? "field_consideration" : "outline";
}

function contentOf(n: FieldNote) {
  return {
    prayer: n.prayer ?? null,
    territory: n.territory ?? null,
    assistants: n.assistants ?? null,
    description: n.description ?? null,
    content: n.content ?? "",
    sort_order: n.sort_order ?? null,
    event_date: n.event_date ?? null,
    period: n.period ?? null,
    // Anexos viajam junto (fotos referenciam apenas o dispositivo local).
    attachments: n.attachments ?? [],
  };
}

function isFolderMarker(row: { content_json: unknown }): boolean {
  const content = row.content_json;
  return !!content && typeof content === "object" && (content as Record<string, unknown>).kind === "folder";
}

function folderPath(folderId: string | null | undefined, folders: NoteFolder[]): string {
  if (!folderId) return "";
  if (folderId === FIXED_FOLDER_WEEK_OUTLINES) return FIXED_OUTLINE_SENTINEL;
  if (folderId === FIXED_FOLDER_WEEK_CONSIDERATIONS) return FIXED_FIELD_SENTINEL;
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

async function ensureFolderPath(
  path: string,
  folders: NoteFolder[],
  type: NoteType,
  preferredId?: string | null,
): Promise<string | null> {
  const parts = splitPath(path);
  if (parts.length === 0) return null;
  let parentId: string | null = null;
  let currentId: string | null = null;
  const mutable = folders;
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    const existing = mutable.find((f) => f.type === type && (f.parentId ?? null) === parentId && f.name === name);
    if (existing) {
      currentId = existing.id;
      parentId = existing.id;
      continue;
    }
    const id = i === parts.length - 1 && preferredId ? preferredId : newFolderId();
    const folder: NoteFolder = { id, name, parentId, type, created_at: Date.now(), deleted_at: null };
    await saveFolder(folder);
    mutable.push(folder);
    currentId = id;
    parentId = id;
  }
  return currentId;
}

export function useOutlinesSync({ auto = true }: { auto?: boolean } = {}) {
  const { user } = useAuth();
  const fnList = useServerFn(listCloudOutlineTree);
  const fnReplace = useServerFn(replaceCloudOutlineTree);
  const ran = useRef(false);

  const syncNow = useCallback(async () => {
    // Fallback: se o React ainda não hidratou `user` (comum em WebView/APK
    // logo após login), valida diretamente a sessão antes de abortar.
    if (!user) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session?.user) return { ok: false as const, error: "not-authenticated" };
      } catch {
        return { ok: false as const, error: "not-authenticated" };
      }
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false as const, error: "offline" };

    const cloud = await fnList();
    if (!cloud.ok) return cloud;

    const [localFoldersAll, localAll] = await Promise.all([
      Promise.all([listFolders("outline"), listFolders("field_consideration")]).then(([a, b]) => [...a, ...b]),
      listAllNotesIncludingTrash(),
    ]);
    const cloudFolders = cloud.folders.filter(isFolderMarker);
    const cloudOutlines = cloud.outlines.filter((row) => !isFolderMarker(row));
    const cloudFolderIdByKey = new Map(
      cloudFolders.map((row) => [`${typeFromRow(row, "folder_type")}::${row.folder_path || row.title}`, row.id]),
    );

    // Mapeia pastas locais -> cloudId existentes por (type, path).
    const foldersByCloudId = new Map<string, NoteFolder>();
    for (const folder of localFoldersAll) {
      const fp = folderPath(folder.id, localFoldersAll);
      const match = cloudFolders.find(
        (row) => row.folder_path === fp && typeFromRow(row, "folder_type") === folder.type,
      );
      if (match) foldersByCloudId.set(match.id, folder);
    }

    const mutableFolders = [...localFoldersAll];
    for (const folderRow of cloudFolders) {
      const type = typeFromRow(folderRow, "folder_type");
      const deleted = folderRow.deleted_at ? new Date(folderRow.deleted_at).getTime() : null;
      const existing = foldersByCloudId.get(folderRow.id);
      if (existing) {
        await saveFolder({ ...existing, name: folderRow.title, deleted_at: deleted });
        continue;
      }
      await ensureFolderPath(folderRow.folder_path || folderRow.title, mutableFolders, type);
    }

    const byCloudId = new Map<string, FieldNote>();
    for (const note of localAll) if (note.cloud_id) byCloudId.set(note.cloud_id, note);

    for (const row of cloudOutlines) {
      const cTime = new Date(row.updated_at).getTime();
      const cj = (row.content_json ?? {}) as Record<string, unknown>;
      const noteType = typeFromRow(row, "note_type");
      let folderId: string | null = null;
      if (row.folder_path === FIXED_OUTLINE_SENTINEL) folderId = FIXED_FOLDER_WEEK_OUTLINES;
      else if (row.folder_path === FIXED_FIELD_SENTINEL) folderId = FIXED_FOLDER_WEEK_CONSIDERATIONS;
      else folderId = await ensureFolderPath(row.folder_path, mutableFolders, noteType);
      const existing = byCloudId.get(row.id);
      const deletedAt = row.deleted_at ? new Date(row.deleted_at).getTime() : null;
      const base = {
        type: noteType,
        folderId,
        title: row.title,
        prayer: typeof cj.prayer === "string" ? cj.prayer : "",
        territory: typeof cj.territory === "string" ? cj.territory : "",
        assistants: typeof cj.assistants === "string" ? cj.assistants : "",
        description: typeof cj.description === "string" ? cj.description : "",
        content: typeof cj.content === "string" ? cj.content : "",
        sort_order: typeof cj.sort_order === "number" ? cj.sort_order : null,
        event_date: typeof cj.event_date === "string" ? cj.event_date : undefined,
        period: typeof cj.period === "string" ? cj.period : undefined,
        attachments: Array.isArray(cj.attachments)
          ? (cj.attachments as FieldNote["attachments"])
          : undefined,
        updated_at: cTime,
        cloud_id: row.id,
        synced_at: Date.now(),
        dirty: false,
        deleted_at: deletedAt,
      };
      if (!existing) {
        await saveNote({ ...base, id: newNoteId(), created_at: new Date(row.created_at).getTime() });
      } else if (cTime > existing.updated_at) {
        await saveNote({ ...existing, ...base });
      }
    }

    const latestFolders = [
      ...(await listFolders("outline")),
      ...(await listFolders("field_consideration")),
    ];
    const latestNotes = await listAllNotesIncludingTrash();
    // Pastas fixas virtuais NUNCA vão para o Supabase.
    const syncableFolders = latestFolders.filter((f) => !isFixedFolder(f.id));
    const pushed = await fnReplace({
      data: {
        folders: syncableFolders.map((folder) => ({
          local_id: folder.id,
          id: cloudFolderIdByKey.get(`${folder.type}::${folderPath(folder.id, latestFolders) || folder.name || "Pasta"}`) ?? null,
          title: folder.name || "Pasta",
          folder_path: folderPath(folder.id, latestFolders) || folder.name || "Pasta",
          folder_type: folder.type,
          deleted_at: folder.deleted_at ? new Date(folder.deleted_at).toISOString() : null,
        })),
        outlines: latestNotes
          .filter((note) => (note.title?.trim()?.length ?? 0) > 0 || (note.content?.trim()?.length ?? 0) > 0)
          .map((note) => ({
            local_id: note.id,
            id: note.cloud_id ?? null,
            title: (note.title || "Sem título").slice(0, 200),
            folder_path: folderPath(note.folderId, latestFolders),
            note_type: typeOfNote(note),
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
    for (const note of latestNotes) {
      const cloudId = remoteByLocalId.get(note.id);
      if (cloudId) await saveNote({ ...note, cloud_id: cloudId, dirty: false, synced_at: Date.now() });
    }
    try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* noop */ }
    try { window.dispatchEvent(new CustomEvent("visita-sc:outlines-synced")); } catch { /* noop */ }
    return { ok: true as const };
  }, [user, fnList, fnReplace]);

  useEffect(() => {
    if (!auto) return;
    const syncedToday = (): boolean => {
      try {
        const raw = localStorage.getItem(LAST_SYNC_KEY);
        if (!raw) return false;
        const ts = Number(raw);
        if (!Number.isFinite(ts) || ts <= 0) return false;
        const d = new Date(ts);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      } catch { return false; }
    };
    const tryRun = (reason: string, force = false) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      // Missão 02 — gate diário: pula sync automático quando já houve
      // uma sincronização bem-sucedida hoje. SIGNED_IN passa `force=true`
      // para garantir pelo menos uma sincronização por dia logo no login.
      if (!force && syncedToday()) return;
      syncNow().catch((err) => console.warn(`[useOutlinesSync] sync failed (${reason})`, err));
    };
    // Disparo inicial quando o user ficar disponível.
    if (user && !ran.current) {
      ran.current = true;
      tryRun("mount");
    }
    // Re-sync ao voltar a ficar online, ao retomar (Capacitor) e ao
    // voltar a aba ficar visível. Cobre o caso APK em que a sessão
    // demora a ser restaurada depois do login.
    const onOnline = () => tryRun("online");
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") tryRun("visible");
    };
    const onResume = () => tryRun("resume");
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVisible);
      document.addEventListener("resume", onResume);
    }
    // Re-sync após SIGNED_IN (força ao menos 1 sync no login do dia).
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        ran.current = true;
        tryRun(event, true);
      } else if (event === "TOKEN_REFRESHED") {
        tryRun(event);
      }
    });
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisible);
        document.removeEventListener("resume", onResume);
      }
      authSub.subscription.unsubscribe();
    };
  }, [auto, user, syncNow]);

  return syncNow;
}
