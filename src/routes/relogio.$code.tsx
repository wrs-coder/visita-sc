import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MirrorClockScreen } from "@/components/circuit/MirrorClockScreen";
import { isMirrorCode, mirrorChannel, parseSnap, type MirrorSnap } from "@/lib/big-events/timer-mirror";

// Tela pública do relógio espelhado: o tablet lê o QR Code do celular do superintendente.
// Não precisa de conta; só recebe o retrato do canal ao vivo com o código aleatório.
export const Route = createFileRoute("/relogio/$code")({
  head: () => ({ meta: [
    { title: "Relógio do evento — Visita SC" },
    { name: "description", content: "Relógio da parte em andamento, espelhado do celular do superintendente." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Relógio do evento — Visita SC" },
    { property: "og:description", content: "Relógio da parte em andamento, espelhado do celular do superintendente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MirrorViewer,
  errorComponent: () => <Shell><p className="m-auto px-6 text-center text-muted-foreground">Não foi possível abrir o relógio. Recarregue a página.</p></Shell>,
  notFoundComponent: () => <Shell><p className="m-auto px-6 text-center text-muted-foreground">Página não encontrada. <Link to="/" className="underline">Início</Link></p></Shell>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="dark fixed inset-0 flex select-none flex-col overflow-hidden bg-background text-foreground [touch-action:manipulation]">{children}</div>;
}

function MirrorViewer() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const valid = isMirrorCode(code);
  const [data, setData] = useState<{ snap: MirrorSnap; at: number } | null>(null);
  const [now, setNow] = useState(0);
  const [full, setFull] = useState(false);

  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!valid) return;
    let alive = true, off: (() => void) | undefined;
    const me = Math.random().toString(36).slice(2, 12);
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!alive) return;
      const ch = supabase.channel(mirrorChannel(code), { config: { broadcast: { self: false } } });
      const hello = () => void ch.send({ type: "broadcast", event: "hello", payload: { id: me } });
      ch.on("broadcast", { event: "snap" }, ({ payload }) => { const p = parseSnap(payload); if (p) setData({ snap: p, at: Date.now() }); });
      ch.subscribe((st) => { if (st === "SUBSCRIBED") hello(); });
      const beat = setInterval(hello, 10_000);
      off = () => { clearInterval(beat); void supabase.removeChannel(ch); };
    });
    return () => { alive = false; off?.(); };
  }, [code, valid]);

  // Tela sempre acesa enquanto mostra o relógio.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const ask = () => { try { void (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => { /* */ }); } catch { /* */ } };
    const onVis = () => { if (!document.hidden) ask(); };
    ask(); document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void lock?.release().catch(() => { /* */ }); };
  }, []);

  // Tela cheia: tenta ao abrir; se o navegador exigir um toque, o primeiro toque em qualquer ponto ativa.
  const [canFull, setCanFull] = useState(false);
  const goFull = useCallback(() => {
    try {
      const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (document.fullscreenElement) return;
      if (d.requestFullscreen) void d.requestFullscreen({ navigationUI: "hide" }).then(() => setFull(true)).catch(() => { /* precisa de toque */ });
      else d.webkitRequestFullscreen?.();
    } catch { /* */ }
  }, []);
  useEffect(() => {
    const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
    setCanFull(!!(d.requestFullscreen || d.webkitRequestFullscreen));
    goFull();
    const onChange = () => setFull(!!document.fullscreenElement);
    const onFirst = () => { goFull(); setFull(true); };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    return () => { document.removeEventListener("fullscreenchange", onChange); window.removeEventListener("pointerdown", onFirst); window.removeEventListener("keydown", onFirst); };
  }, [goFull]);

  if (!valid) return <Shell><p className="m-auto max-w-xl px-6 text-center text-[clamp(16px,2.6vw,28px)] text-muted-foreground">{t("timerMirror.invalid")}</p></Shell>;
  const signal = !!data && now - data.at < 15_000;
  return (
    <Shell>
      <MirrorClockScreen snap={data?.snap ?? null} receivedAt={data?.at ?? 0} now={now || data?.at || 0} signal={signal} hint={code} />
      {!full && canFull && (
        <div className="pointer-events-none fixed inset-x-0 top-[max(1.5vh,env(safe-area-inset-top))] flex justify-center">
          <p className="rounded-full bg-muted/90 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">{t("timerMirror.tapFull")}</p>
        </div>
      )}
    </Shell>
  );
}
