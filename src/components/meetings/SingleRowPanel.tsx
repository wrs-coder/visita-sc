// Hook + helper genérico para painéis de "1 registro por visita".
// Carrega a linha (se não existir, insere uma vazia com visit_id) e fornece
// um `save(patch)` que atualiza via offlineUpdate.

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineInsert, offlineUpdate } from "@/lib/offline-supabase";
import type { Visit } from "@/hooks/use-active-visit";
import { toast } from "sonner";

export function useSingleRow<T extends Record<string, unknown> & { id: string }>(
  table: string,
  columns: string,
  visit: Visit | null,
) {
  const [row, setRow] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!visit) { setRow(null); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from(table as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(columns as any)
        .eq("visit_id", visit.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setRow(data as unknown as T);
      } else if (!creatingRef.current) {
        creatingRef.current = true;
        await offlineInsert(table, { visit_id: visit.id });
        // recarrega
        const r = await supabase.from(table as never)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select(columns as any).eq("visit_id", visit.id).maybeSingle();
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

  const save = useCallback(async (patch: Partial<T>) => {
    if (!row) return;
    setRow((r) => (r ? { ...r, ...patch } : r));
    const { error, queued } = await offlineUpdate(table, patch as Record<string, unknown>, { id: row.id });
    if (error) toast.error(error.message);
    else if (queued) toast.success("Salvo offline");
  }, [row, table]);

  return { row, loading, save };
}
