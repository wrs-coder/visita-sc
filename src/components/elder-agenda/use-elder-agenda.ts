import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAgendaAttachmentUrl, getElderAgenda, saveElderAgenda, scAttachmentUploadUrl, scPublishElderAgenda, scDeleteAttachment } from "@/lib/elder-agenda.functions";
import { supabase } from "@/integrations/supabase/client";
import { cloudAttachmentCount, responseIds } from "@/lib/elder-agenda/agenda";
import type { AgendaAttachmentApi } from "./AgendaAttachments";
import { authorSecret } from "./agenda-author";
import { withNetworkWindow } from "@/lib/net-policy";
import { clearAgendaCache, readAgendaCache, writeAgendaCache } from "@/lib/elder-agenda/agenda-cache";
import type { AgendaData, AgendaPublisher, AgendaSaver } from "./ElderAgendaView";

/** Carrega a pauta da visita da nuvem; sem internet, usa a cópia guardada no aparelho (somente leitura). */
export function useElderAgenda(visitId: string | null | undefined) {
  const fnGet = useServerFn(getElderAgenda);
  const fnSave = useServerFn(saveElderAgenda);
  const fnUrl = useServerFn(getAgendaAttachmentUrl);
  const fnUp = useServerFn(scAttachmentUploadUrl);
  const fnDel = useServerFn(scDeleteAttachment);
  const fnPub = useServerFn(scPublishElderAgenda);
  const [raw, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const reload = useCallback(async () => {
    if (!visitId) return;
    setLoading(true); setError(null);
    const scope = `visit.${visitId}`;
    try {
      const r = await withNetworkWindow(() => fnGet({ data: { visitId } }));
      // Resposta do servidor sem pauta (visita finalizada ou sem acesso): a cópia do aparelho também sai.
      if (r.ok) { setData(r); writeAgendaCache(scope, r); setLoadedAt(Date.now()); } else { clearAgendaCache(scope); setData(null); setError(r.error); }
    } catch {
      const c = readAgendaCache(scope);
      if (c) setData({ ...c, offline: true });
      else setError("Sem conexão. A pauta ainda não foi guardada neste aparelho.");
    } finally { setLoading(false); }
  }, [visitId, fnGet]);

  useEffect(() => { void reload(); }, [reload]);

  const save: AgendaSaver = useCallback(async (payload) => {
    if (!visitId) return { ok: false, error: "Sem visita." };
    // Respostas que esta tela já conhece: as que chegaram depois não são apagadas ao salvar.
    const knownResponseIds = [...new Set([...(raw ? responseIds(raw.payload) : []), ...responseIds(payload)])];
    const r = await withNetworkWindow(() => fnSave({ data: { visitId, payload: payload as unknown as Record<string, unknown>, authorSecret: authorSecret() || undefined, knownResponseIds } }));
    if (r.ok) setData((d) => { if (!d) return d; const next = { ...d, payload }; writeAgendaCache(`visit.${visitId}`, next); return next; });
    if (r.ok) void reload(); // o que aparece = o que ficou salvo (inclui o que outros mandaram)
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }, [visitId, fnSave, raw, reload]);

  const publish: AgendaPublisher = useCallback(async () => {
    if (!visitId) return { ok: false, error: "Sem visita." };
    const r = await withNetworkWindow(() => fnPub({ data: { visitId } }));
    if (r.ok) await reload();
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }, [visitId, fnPub, reload]);

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
  const data = useMemo(() => (raw ? { ...raw, attachmentApi, loadedAt } : null), [raw, attachmentApi, loadedAt]);

  return { data, error, loading, reload, save, publish };
}
