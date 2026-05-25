// Hook + helper genérico para painéis de "1 registro por visita".
//
// - Carrega a linha (se não existir, insere placeholder).
// - `save(patch)` enfileira em rascunho local global (MeetingsDraftContext)
//   se houver provider; caso contrário, grava imediatamente via offlineUpdate.
// - O `row` retornado já inclui o patch em rascunho aplicado, para que a UI
//   reflita o que o utilizador está digitando.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { offlineInsert, offlineUpdate } from "@/lib/offline-supabase";
import type { Visit } from "@/hooks/use-active-visit";
import { toast } from "sonner";
import { useMeetingsDraft } from "./MeetingsDraftContext";

export function useSingleRow<T extends { id: string }>(
  table: string,
  columns: string,
  visit: Visit | null,
) {
  const { t } = useTranslation();
  const [row, setRow] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const creatingRef = useRef(false);
  const draftCtx = useMeetingsDraft();

  useEffect(() => {
    if (!visit) { setRow(null); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(table as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(columns as any)
        .eq("visit_id", visit.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) { setRow(data as unknown as T); setLoading(false); return; }
      if (error) { setRow(null); setLoading(false); return; }
      if (!creatingRef.current) {
        creatingRef.current = true;
        await offlineInsert(table, { visit_id: visit.id });
        const r = await supabase.from(table as never)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select(columns as any).eq("visit_id", visit.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!cancelled) setRow((r.data as unknown as T) ?? null);
        creatingRef.current = false;
      }
      setLoading(false);
    };
    load();
    const ch = supabase.channel(`${table}-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [table, columns, visit]);

  // Mescla com rascunho pendente (se houver) para refletir edições não salvas.
  const draftPatch =
    row && draftCtx ? draftCtx.drafts[`${table}:${row.id}`] : undefined;
  const mergedRow = useMemo<T | null>(() => {
    if (!row) return null;
    if (!draftPatch) return row;
    return { ...row, ...(draftPatch as Partial<T>) };
  }, [row, draftPatch]);

  const save = useCallback(async (patch: Partial<T>) => {
    if (!row) return;
    if (draftCtx) {
      // Enfileira local: só persiste no servidor ao clicar em "Salvar dados".
      draftCtx.queue(table, row.id, patch as Record<string, unknown>);
      return;
    }
    setRow((r) => (r ? { ...r, ...patch } : r));
    const { error, queued } = await offlineUpdate(table, patch as Record<string, unknown>, { id: row.id });
    if (error) toast.error(error.message);
    else if (queued) toast.success(t("common.savedOffline"));
  }, [row, table, draftCtx, t]);

  return { row: mergedRow, loading, save };
}
