// Rascunho local global para a aba "Reuniões e Discursos".
//
// Comportamento: as edições nos campos não vão direto ao servidor; ficam
// acumuladas neste contexto e persistidas em localStorage (resilientes a
// recarregar/fechar a tela). O envio real só acontece quando o utilizador
// clica em "Salvar dados" — `flush()` aplica todos os patches em lote via
// `offlineUpdate`, expõe um indicador de progresso e invalida o cache do
// react-query para refrescar todos os painéis com os dados do servidor.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { offlineUpdate } from "@/lib/offline-supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";

type DraftPatch = Record<string, unknown>;
type DraftStore = Record<string, DraftPatch>; // key = `${table}:${rowId}`

interface DraftCtx {
  drafts: DraftStore;
  queue: (table: string, rowId: string, patch: DraftPatch) => void;
  clearRow: (table: string, rowId: string) => void;
  discardAll: () => void;
  flush: () => Promise<void>;
  dirty: boolean;
  saving: boolean;
  progress: number; // 0..100 durante flush
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastFailedTables: string[];
}

const Ctx = createContext<DraftCtx | null>(null);

const makeKey = (t: string, id: string) => `${t}:${id}`;

export function MeetingsDraftProvider({
  scopeKey,
  children,
}: {
  scopeKey: string; // ex.: `${userId}:${congregationId}`
  children: ReactNode;
}) {
  const storageKey = `meetings-draft:${scopeKey}`;
  const [drafts, setDrafts] = useState<DraftStore>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastFailedTables, setLastFailedTables] = useState<string[]>([]);
  const hydratedRef = useRef(false);
  const queryClient = useQueryClient();

  // Hidrata do localStorage sempre que muda o escopo (utilizador/congregação).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      setDrafts(raw ? (JSON.parse(raw) as DraftStore) : {});
    } catch {
      setDrafts({});
    }
    hydratedRef.current = true;
  }, [storageKey]);

  // Persiste a cada mudança.
  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) return;
    try {
      if (Object.keys(drafts).length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(drafts));
    } catch {
      /* ignora cota / modo privado */
    }
  }, [drafts, storageKey]);

  const dirty = Object.keys(drafts).length > 0;

  // Alerta de segurança ao tentar fechar/atualizar com rascunho pendente.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Bloqueio de navegação interna (menu lateral / outras rotas) com rascunho pendente.
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !window.confirm(
        "Há um rascunho com alterações não salvas nesta tela. Sair sem clicar em \"Salvar dados\" mantém o rascunho local, mas o servidor não será atualizado. Continuar?",
      );
    },
    enableBeforeUnload: false,
  });

  const queue = useCallback((table: string, rowId: string, patch: DraftPatch) => {
    setDrafts((prev) => {
      const k = makeKey(table, rowId);
      return { ...prev, [k]: { ...(prev[k] ?? {}), ...patch } };
    });
  }, []);

  const clearRow = useCallback((table: string, rowId: string) => {
    setDrafts((prev) => {
      const k = makeKey(table, rowId);
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setDrafts({});
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    toast.success("Rascunho descartado");
  }, [storageKey]);

  const flush = useCallback(async () => {
    const entries = Object.entries(drafts).filter(
      ([, p]) => p && Object.keys(p).length > 0,
    );
    if (entries.length === 0) {
      toast.info("Nada para salvar");
      return;
    }
    setSaving(true);
    setProgress(0);
    setLastFailedTables([]);
    try {
      const failedKeys: string[] = [];
      const failedTables = new Set<string>();
      const failedMessages = new Set<string>();
      const touched = new Set<string>();
      let done = 0;
      for (const [k, patch] of entries) {
        const sep = k.indexOf(":");
        const table = k.slice(0, sep);
        const id = k.slice(sep + 1);
        const { error } = await offlineUpdate(table, patch, { id });
        if (error) {
          failedKeys.push(k);
          failedTables.add(table);
          failedMessages.add(`${table}: ${error.message}`);
        } else {
          touched.add(table);
        }
        done += 1;
        setProgress(Math.round((done / entries.length) * 100));
      }
      // Invalida caches das tabelas com sucesso (recarrega painéis).
      if (touched.size) {
        await Promise.all(
          Array.from(touched).map((t) =>
            queryClient.invalidateQueries({ queryKey: [t] }),
          ),
        );
        await queryClient.invalidateQueries();
      }
      if (failedKeys.length === 0) {
        toast.success("Dados salvos");
        setDrafts({});
        setLastSyncedAt(new Date());
        setLastFailedTables([]);
      } else {
        // Mantém apenas os rascunhos que falharam para permitir nova tentativa
        // sem perder o que o utilizador digitou.
        setDrafts((prev) => {
          const next: DraftStore = {};
          for (const key of failedKeys) {
            if (prev[key]) next[key] = prev[key];
          }
          return next;
        });
        setLastFailedTables(Array.from(failedTables));
        toast.error(
          `Falha ao salvar ${failedKeys.length} alteraç${failedKeys.length === 1 ? "ão" : "ões"}`,
          {
            description: `Tabelas afetadas: ${Array.from(failedTables).join(", ")}. Clique em "Salvar dados" para tentar novamente — o rascunho local foi preservado.`,
          },
        );
      }
    } finally {
      setSaving(false);
      setTimeout(() => setProgress(0), 600);
    }
  }, [drafts, queryClient]);

  const value = useMemo<DraftCtx>(
    () => ({
      drafts,
      queue,
      clearRow,
      discardAll,
      flush,
      dirty,
      saving,
      progress,
      pendingCount: Object.keys(drafts).length,
      lastSyncedAt,
      lastFailedTables,
    }),
    [drafts, queue, clearRow, discardAll, flush, dirty, saving, progress, lastSyncedAt, lastFailedTables],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMeetingsDraft() {
  return useContext(Ctx);
}

/** Patch atualmente em rascunho para uma linha específica (ou objeto vazio). */
export function useDraftPatch(table: string, rowId: string | null | undefined) {
  const ctx = useMeetingsDraft();
  if (!ctx || !rowId) return {} as DraftPatch;
  return ctx.drafts[makeKey(table, rowId)] ?? {};
}
