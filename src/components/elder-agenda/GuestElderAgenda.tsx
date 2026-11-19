// Pauta no acesso "Corpo de anciãos" (sem cadastro): edita só o que o SC marcou como "Todos".
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guestGetElderAgenda, guestSaveElderAgenda } from "@/lib/elder-agenda.functions";
import { ElderAgendaView, type AgendaData, type AgendaSaver } from "./ElderAgendaView";

export function GuestElderAgenda({ inviteCode }: { inviteCode: string }) {
  const fnGet = useServerFn(guestGetElderAgenda);
  const fnSave = useServerFn(guestSaveElderAgenda);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const r = await fnGet({ data: { inviteCode } }); if (r.ok) setData(r); else setError(r.error); }
    catch { setError("Sem conexão. A pauta precisa de internet para abrir."); }
  }, [fnGet, inviteCode]);
  useEffect(() => { void load(); }, [load]);
  const save: AgendaSaver = async (payload) => {
    const r = await fnSave({ data: { inviteCode, payload: payload as unknown as Record<string, unknown> } });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  };
  if (error) return <div className="text-center py-8 space-y-3"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" onClick={() => void load()}>Tentar de novo</Button></div>;
  if (!data) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  return <ElderAgendaView key={data.visitId} data={data} save={save} />;
}
