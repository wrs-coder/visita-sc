// Hook de sincronização cloud↔local para esboços pessoais.
// - Baixa esboços da nuvem ao logar (overwrite por LWW).
// - Empurra esboços locais sem cloud_id (migração one-shot).
// - Reconcilia exclusões: itens com cloud_id que sumiram da nuvem → soft-delete local.

import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listAllNotesIncludingTrash,
  saveNote,
  newNoteId,
  type FieldNote,
} from "@/lib/bible-notes-store";
import {
  listCloudOutlines,
  bulkPushOutlines,
  pushOutlineToCloud,
} from "@/lib/personal-outlines.functions";

const MIGRATION_KEY = "visita-sc:outlines-migration:v1";
const LAST_SYNC_KEY = "visita-sc:outlines-last-sync";

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

export function useOutlinesSync() {
  const { user } = useAuth();
  const fnList = useServerFn(listCloudOutlines);
  const fnBulkPush = useServerFn(bulkPushOutlines);
  const fnPush = useServerFn(pushOutlineToCloud);
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    ran.current = true;

    (async () => {
      try {
        // 1. Baixar nuvem.
        const cloud = await fnList();
        if (!cloud.ok) return;

        const localAll = await listAllNotesIncludingTrash();
        const localOutlines = localAll.filter(isOutline);
        const byCloudId = new Map<string, FieldNote>();
        for (const n of localOutlines) if (n.cloud_id) byCloudId.set(n.cloud_id, n);

        // 1a. Merge cloud → local (LWW por updated_at).
        for (const c of cloud.outlines) {
          const cTime = new Date(c.updated_at).getTime();
          const existing = byCloudId.get(c.id);
          if (!existing) {
            // Novo da nuvem.
            const cj = (c.content_json ?? {}) as Record<string, unknown>;
            await saveNote({
              id: newNoteId(),
              type: "outline",
              folderId: null,
              title: c.title,
              prayer: typeof cj.prayer === "string" ? cj.prayer : "",
              territory: typeof cj.territory === "string" ? cj.territory : "",
              assistants: typeof cj.assistants === "string" ? cj.assistants : "",
              description: typeof cj.description === "string" ? cj.description : "",
              content: typeof cj.content === "string" ? cj.content : "",
              created_at: new Date(c.created_at).getTime(),
              updated_at: cTime,
              cloud_id: c.id,
              synced_at: Date.now(),
              dirty: false,
            });
          } else if (cTime > existing.updated_at) {
            // Cloud é mais novo: sobrescreve local.
            const cj = (c.content_json ?? {}) as Record<string, unknown>;
            await saveNote({
              ...existing,
              title: c.title,
              prayer: typeof cj.prayer === "string" ? cj.prayer : "",
              territory: typeof cj.territory === "string" ? cj.territory : "",
              assistants: typeof cj.assistants === "string" ? cj.assistants : "",
              description: typeof cj.description === "string" ? cj.description : "",
              content: typeof cj.content === "string" ? cj.content : "",
              updated_at: cTime,
              cloud_id: c.id,
              synced_at: Date.now(),
              dirty: false,
              deleted_at: null,
            });
          }
        }

        // 2. Migração one-shot: esboços locais sem cloud_id e sem soft-delete.
        const alreadyMigrated = typeof localStorage !== "undefined" && localStorage.getItem(MIGRATION_KEY) === "1";
        const orphans = localOutlines
          .filter((n) => !n.cloud_id && n.deleted_at == null && (n.title?.trim()?.length ?? 0) > 0);
        if (orphans.length && !alreadyMigrated) {
          // Em lotes de 50.
          for (let i = 0; i < orphans.length; i += 50) {
            const batch = orphans.slice(i, i + 50);
            const r = await fnBulkPush({
              data: {
                items: batch.map((n) => ({
                  title: n.title.slice(0, 200),
                  folder_path: "",
                  content: contentOf(n),
                })),
              },
            });
            if (!r.ok) break;
            // Vincula cloud_id por índice (mesma ordem).
            for (let j = 0; j < batch.length && j < r.outlines.length; j++) {
              const local = batch[j];
              const remote = r.outlines[j];
              await saveNote({
                ...local,
                cloud_id: remote.id,
                synced_at: Date.now(),
                dirty: false,
              });
            }
          }
          try { localStorage.setItem(MIGRATION_KEY, "1"); } catch { /* noop */ }
        }

        // 3. Empurra mudanças dirty pendentes (LWW lado local).
        const refreshed = (await listAllNotesIncludingTrash()).filter(isOutline);
        for (const n of refreshed) {
          if (!n.dirty || !n.cloud_id) continue;
          if (n.deleted_at != null) continue; // exclusões tratadas separadamente
          const r = await fnPush({
            data: {
              id: n.cloud_id,
              title: (n.title || "Sem título").slice(0, 200),
              folder_path: "",
              content: contentOf(n),
            },
          });
          if (r.ok) {
            await saveNote({ ...n, dirty: false, synced_at: Date.now() });
          }
        }

        try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* noop */ }
      } catch (err) {
        console.warn("[useOutlinesSync] sync failed", err);
      }
    })();
  }, [user, fnList, fnBulkPush, fnPush]);
}
