import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAgendaAttachmentUrl, getElderAgenda, saveElderAgenda, scAttachmentUploadUrl, scDeleteAttachment } from "@/lib/elder-agenda.functions";
import { supabase } from "@/integrations/supabase/client";
import { cloudAttachmentCount } from "@/lib/elder-agenda/agenda";
import type { AgendaAttachmentApi } from "./AgendaAttachments";
import { withNetworkWindow } from "@/lib/net-policy";
import { readAgendaCache, writeAgendaCache } from "@/lib/elder-agenda/agenda-cache";
import type { AgendaData, AgendaSaver } from "./ElderAgendaView";

/** Carrega a pauta da visita da nuvem; sem internet, usa a cópia guardada no aparelho (somente leitura). */
export function useElderAgenda(visitId: string | null | undefined) {
  const fnGet = useServerFn(getElderAgenda);
  const fnSave = useServerFn(saveElderAgenda);
  const fnUrl = useServerFn(getAgendaAttachmentUrl);
  const fnUp = useServerFn(scAttachmentUploadUrl);
  const fnDel = useServerFn(scDeleteAttachment);
  const [raw, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!visitId) return;
    setLoading(true); setError(null);
    const scope = `visit.${visitId}`;
    try {
      const r = await withNetworkWindow(() => fnGet({ data: { visitId } }));
      if (r.ok) { setData(r); writeAgendaCache(scope, r); } else setError(r.error);
    } catch {
      const c = readAgendaCache(scope);
      if (c) setData({ ...c, offline: true });
      else setError("Sem conexão. A pauta ainda não foi guardada neste aparelho.");
    } finally { setLoading(false); }
  }, [visitId, fnGet]);

  useEffect(() => { void reload(); }, [reload]);

  const save: AgendaSaver = useCallback(async (payload) => {
    if (!visitId) return { ok: false, error: "Sem visita." };
    const r = await withNetworkWindow(() => fnSave({ data: { visitId, payload: payload as unknown as Record<string, unknown> } }));
    if (r.ok) setData((d) => { if (!d) return d; const next = { ...d, payload }; writeAgendaCache(`visit.${visitId}`, next); return next; });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }, [visitId, fnSave]);

  const attachmentApi = useMemo<AgendaAttachmentApi | undefined>(() => {
    if (!visitId) return undefined;
    return {
      urlFor: async (path) => { const r = await withNetworkWindow(() => fnUrl({ data: { visitId, path } })); return r.ok ? r.url : null; },
      upload: async (blob, ext) => {
        const r = await withNetworkWindow(() => fnUp({ data: { visitId, ext, size: blob.size, currentCount: raw ? cloudAttachmentCount(raw.payload) : 0 } }));
        if (!r.ok) return { error: r.error };
        const { error: e } = await supabase.storage.from("elder-agenda-files").uploadToSignedUrl(r.path, r.token, blob, { contentType: ext === "pdf" ? "application/pdf" : "image/jpeg" });
        return e ? { error: "Não foi possível enviar." } : { path: r.path };
      },
      remove: async (path) => { await withNetworkWindow(() => fnDel({ data: { visitId, path } })); },
    };
  }, [visitId, fnUrl, fnUp, fnDel, raw]);
  const data = useMemo(() => (raw ? { ...raw, attachmentApi } : null), [raw, attachmentApi]);

  return { data, error, loading, reload, save };
}
