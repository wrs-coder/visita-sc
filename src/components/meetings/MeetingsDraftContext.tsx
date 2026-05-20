// Rascunho local global para a aba "Reuniões e Discursos".
//
// Comportamento: as edições nos campos não vão direto ao servidor; ficam
// acumuladas neste contexto e persistidas em localStorage (resilientes a
// recarregar/fechar a tela). O envio real só acontece quando o utilizador
// clica em "Salvar dados" — `flush()` aplica todos os patches de uma só vez
// via `offlineUpdate`. Disponível para qualquer utilizador autorizado
// (Superintendente ou ancião com permissão).

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

type DraftPatch = Record<string, unknown>;
type DraftStore = Record<string, DraftPatch>; // key = `${table}:${rowId}`

interface DraftCtx {
  drafts: DraftStore;
  queue: (table: string, rowId: string, patch: DraftPatch) => void;
  clearRow: (table: string, rowId: string) => void;
  flush: () => Promise<void>;
  dirty: boolean;
  saving: boolean;
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
  const hydratedRef = useRef(false);

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

  const flush = useCallback(async () => {
    const entries = Object.entries(drafts).filter(
      ([, p]) => p && Object.keys(p).length > 0,
    );
    if (entries.length === 0) {
      toast.info("Nada para salvar");
      return;
    }
    setSaving(true);
    try {
      const failed: string[] = [];
      for (const [k, patch] of entries) {
        const sep = k.indexOf(":");
        const table = k.slice(0, sep);
        const id = k.slice(sep + 1);
        const { error } = await offlineUpdate(table, patch, { id });
        if (error) failed.push(`${table}: ${error.message}`);
      }
      if (failed.length) {
        toast.error(failed[0]);
      } else {
        toast.success("Dados salvos");
        setDrafts({});
      }
    } finally {
      setSaving(false);
    }
  }, [drafts]);

  const value = useMemo<DraftCtx>(
    () => ({
      drafts,
      queue,
      clearRow,
      flush,
      dirty: Object.keys(drafts).length > 0,
      saving,
    }),
    [drafts, queue, clearRow, flush, saving],
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
