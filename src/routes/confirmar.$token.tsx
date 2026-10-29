import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { getAssignment, respondAssignment, type PublicPart } from "@/lib/big-events/confirm.functions";
import { formatEventDate } from "@/lib/big-events/invite";
import { MAX_DEVICE_FAILS, LOCK_MS } from "@/lib/big-events/lockout";

export const Route = createFileRoute("/confirmar/$token")({
  head: () => ({ meta: [
    { title: "Confirmar designação — Visita SC" },
    { name: "description", content: "Confirme ou recuse sua designação em um evento do circuito." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Confirmar designação — Visita SC" },
    { property: "og:description", content: "Confirme ou recuse sua designação em um evento do circuito." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConfirmPage,
});

const DEV_KEY = "bigEvents.deviceFails";
function deviceLocked(): boolean {
  try { const s = JSON.parse(localStorage.getItem(DEV_KEY) ?? "{}") as { n?: number; until?: number }; return !!s.until && s.until > Date.now(); } catch { return false; }
}
function bumpDevice(success: boolean) {
  try {
    if (success) { localStorage.removeItem(DEV_KEY); return; }
    const s = JSON.parse(localStorage.getItem(DEV_KEY) ?? "{}") as { n?: number };
    const n = (s.n ?? 0) + 1;
    localStorage.setItem(DEV_KEY, JSON.stringify(n >= MAX_DEVICE_FAILS ? { n: 0, until: Date.now() + LOCK_MS } : { n }));
  } catch { /* */ }
}

function ConfirmPage() {
  const { token } = Route.useParams();
  const get = useServerFn(getAssignment);
  const respond = useServerFn(respondAssignment);
  const [pin, setPin] = useState("");
  const [part, setPart] = useState<PublicPart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  const errMsg = (e: string) => e === "locked" ? "Muitas tentativas. Aguarde 15 minutos e tente de novo."
    : e === "notfound" ? "Este link não existe mais. Peça um novo convite." : "PIN incorreto.";

  const submitPin = async () => {
    if (deviceLocked()) { setError(errMsg("locked")); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError("Digite o PIN de 4 a 6 números."); return; }
    setBusy(true); setError(null);
    try {
      const r = await get({ data: { token, pin } });
      bumpDevice(r.ok);
      if (r.ok) setPart(r.part); else setError(errMsg(r.error));
    } catch { setError("Não foi possível verificar agora. Tente novamente."); }
    setBusy(false);
  };
  const act = async (action: "confirm" | "decline") => {
    if (action === "decline" && !reason.trim()) { setError("Explique o motivo da recusa."); return; }
    setBusy(true); setError(null);
    try {
      const r = await respond({ data: { token, pin, action, reason: action === "decline" ? reason.trim() : undefined } });
      if (r.ok) { setPart(r.part); setDone(true); } else setError(errMsg(r.error));
    } catch { setError("Não foi possível enviar agora. Tente novamente."); }
    setBusy(false);
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-4">
        <p className="text-center text-sm font-semibold text-muted-foreground">Visita SC · Designação</p>
        {!part ? (
          <Card><CardContent className="space-y-4 p-6">
            <h1 className="text-lg font-semibold">Digite o PIN que você recebeu na mensagem</h1>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") void submitPin(); }}
              className="h-12 text-center font-mono text-2xl tracking-[0.5em]" aria-label="PIN" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy} onClick={submitPin}>Continuar</Button>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="space-y-3 p-6">
            <div>
              <h1 className="text-lg font-semibold">{part.event_name}</h1>
              <p className="text-sm text-muted-foreground">{[formatEventDate(part.event_date), part.location].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              {part.speaker_name && <p><b>Orador:</b> {part.speaker_name}</p>}
              <p><b>{part.outline_number ? `Parte Nº ${part.outline_number}` : part.part_type_label}</b>{part.part_time ? ` · ${part.part_time}` : ""}{part.duration_min ? ` · ${part.duration_min} min` : ""}</p>
              {part.theme && <p><b>Tema:</b> {part.theme}</p>}
              {part.instructions && <p><b>Instruções:</b> {part.instructions}</p>}
              {part.next_speaker && <p><b>Próximo orador:</b> {part.next_speaker}</p>}
              {part.extra_info && <p className="whitespace-pre-wrap"><b>Informações:</b> {part.extra_info}</p>}
            </div>
            {done || part.status !== "pending" ? (
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                {part.status === "confirmed" ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-destructive" />}
                <span>{part.status === "confirmed" ? "Designação confirmada. Obrigado!" : "Recusa registrada. Obrigado por avisar."}</span>
              </div>
            ) : declining ? (
              <div className="space-y-2">
                <Textarea value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Explique o motivo da recusa" rows={4} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDeclining(false)}>Voltar</Button>
                  <Button variant="destructive" className="flex-1" disabled={busy} onClick={() => act("decline")}>Enviar recusa</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={busy} onClick={() => act("confirm")}>Confirmar</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDeclining(true)}>Recusar</Button>
                </div>
              </div>
            )}
          </CardContent></Card>
        )}
      </div>
    </main>
  );
}
