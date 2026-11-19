import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getElderAgenda, saveElderAgenda } from "@/lib/elder-agenda.functions";
import { withNetworkWindow } from "@/lib/net-policy";
import type { AgendaData, AgendaSaver } from "./ElderAgendaView";

/** Carrega a pauta da visita (sempre da nuvem: vários anciãos escrevem nela). */
export function useElderAgenda(visitId: string | null | undefined) {
  const fnGet = useServerFn(getElderAgenda);
  const fnSave = useServerFn(saveElderAgenda);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!visitId) return;
    setLoading(true); setError(null);
    try {
      const r = await withNetworkWindow(() => fnGet({ data: { visitId } }));
      if (r.ok) setData(r); else setError(r.error);
    } catch { setError("Sem conexão. A pauta precisa de internet para abrir."); }
    finally { setLoading(false); }
  }, [visitId, fnGet]);

  useEffect(() => { void reload(); }, [reload]);

  const save: AgendaSaver = useCallback(async (payload, permissions) => {
    if (!visitId) return { ok: false, error: "Sem visita." };
    const r = await withNetworkWindow(() => fnSave({ data: { visitId, payload: payload as unknown as Record<string, unknown>, permissions: permissions as unknown as Record<string, unknown> | undefined } }));
    if (r.ok) setData((d) => (d ? { ...d, payload, permissions: permissions ?? d.permissions } : d));
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }, [visitId, fnSave]);

  return { data, error, loading, reload, save };
}
