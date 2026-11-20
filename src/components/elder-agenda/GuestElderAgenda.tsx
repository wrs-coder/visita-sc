// Pauta no acesso "Corpo de anciãos" (sem cadastro): edita só o que o SC liberou; sem internet usa a cópia do aparelho.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guestGetAgendaAttachmentUrl, guestGetElderAgenda, guestSaveElderAgenda } from "@/lib/elder-agenda.functions";
import { clearAgendaCache, readAgendaCache, writeAgendaCache } from "@/lib/elder-agenda/agenda-cache";
import { authorSecret } from "./agenda-author";
import { ElderAgendaView, type AgendaData, type AgendaSaver } from "./ElderAgendaView";

export function GuestElderAgenda({ inviteCode }: { inviteCode: string }) {
  const fnGet = useServerFn(guestGetElderAgenda);
  const fnSave = useServerFn(guestSaveElderAgenda);
  const fnUrl = useServerFn(guestGetAgendaAttachmentUrl);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const scope = `code.${inviteCode}`;
  const load = useCallback(async () => {
    setError(null);
    try { const r = await fnGet({ data: { inviteCode } }); if (r.ok) { setData(r); writeAgendaCache(scope, r); setLoadedAt(Date.now()); } else { clearAgendaCache(scope); setData(null); setError(r.error); } }
    catch {
      const c = readAgendaCache(scope);
      if (c) setData({ ...c, offline: true }); else setError("Sem conexão. A pauta ainda não foi guardada neste aparelho.");
    }
  }, [fnGet, inviteCode, scope]);
  useEffect(() => { void load(); }, [load]);
  const save: AgendaSaver = async (payload) => {
    const r = await fnSave({ data: { inviteCode, payload: payload as unknown as Record<string, unknown>, authorSecret: authorSecret() || undefined } });
    if (r.ok) { setData((d) => { if (!d) return d; const next = { ...d, payload }; writeAgendaCache(scope, next); return next; }); void load(); }
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  };
  if (error) return <div className="text-center py-8 space-y-3"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" onClick={() => void load()}>Tentar de novo</Button></div>;
  if (!data) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const attachmentApi = { urlFor: async (path: string) => { const r = await fnUrl({ data: { inviteCode, path } }); return r.ok ? r.url : null; } };
  return <ElderAgendaView key={data.visitId} data={{ ...data, attachmentApi, loadedAt }} save={save} onRefresh={load} />;
}
