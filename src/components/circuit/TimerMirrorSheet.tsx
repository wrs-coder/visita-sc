// Painel "Espelhar relógio": QR Code para o tablet/TV pela internet ou pelo Wi‑Fi do salão.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Globe, Loader2, MonitorSmartphone, RefreshCw, Share2, Wifi } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { appConfirm } from "@/components/ui/app-dialogs";
import { mirrorUrl } from "@/lib/big-events/timer-mirror";
import { localMirrorSupported, localMirrorUrl, mirrorOrigin } from "@/lib/big-events/timer-mirror-link";
import type { TimerMirrorApi } from "./use-timer-mirror";

export function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import("qrcode").then((Q) => Q.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then((s) => { if (alive) setSvg(s); }).catch(() => { /* */ });
    return () => { alive = false; };
  }, [value]);
  return (
    <div className="mx-auto aspect-square w-[min(15rem,60vw)] overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-border" aria-label="QR Code">
      {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
    </div>
  );
}

export async function shareLink(url: string, title: string) {
  try {
    if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ title, url }); return; }
    if (navigator.share) await navigator.share({ title, url });
  } catch { /* cancelado */ }
}

export function TimerMirrorSheet({ open, onOpenChange, mirror }: { open: boolean; onOpenChange: (o: boolean) => void; mirror: TimerMirrorApi }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"online" | "local">(() => (mirror.prefs.local && !mirror.prefs.online ? "local" : "online"));
  const url = mirrorUrl(mirror.prefs.code, mirrorOrigin());
  const canShare = typeof navigator !== "undefined" && (Capacitor.isNativePlatform() || !!navigator.share);
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(t("timerMirror.copied")); } catch { /* */ }
  };
  const renew = async () => {
    if (!(await appConfirm({ title: t("timerMirror.newCode"), description: t("timerMirror.newCodeConfirm"), confirmLabel: t("timerMirror.newCode") }))) return;
    mirror.renewCode();
  };
  const viewersPill = (n: number) => (
    <p className={`mx-auto flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${n > 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{n > 0 ? t("timerMirror.viewers", { count: n }) : t("timerMirror.viewersNone")}
    </p>
  );
  const L = mirror.local;
  const localAddr = L.ip ? localMirrorUrl(L.ip, L.port) : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="dark max-h-[92vh] border-border bg-background text-foreground">
        <div className="overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="flex items-center gap-2 text-lg"><MonitorSmartphone className="h-5 w-5 text-primary" />{t("timerMirror.title")}</DrawerTitle>
            <DrawerDescription>{t("timerMirror.subtitle")}</DrawerDescription>
          </DrawerHeader>

          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-sm font-medium">
            {(["online", "local"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`flex items-center justify-center gap-1.5 rounded-full py-2 transition-colors ${tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {k === "online" ? <Globe className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                {t(k === "online" ? "timerMirror.online" : "timerMirror.local")}
                {(k === "online" ? mirror.prefs.online : mirror.prefs.local) && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
              </button>
            ))}
          </div>

          {tab === "online" ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{t("timerMirror.onlineHint")}</p>
              {!mirror.prefs.online ? (
                <Button className="h-12 w-full rounded-2xl text-[15px]" onClick={() => mirror.setOnline(true)}>{t("timerMirror.start")}</Button>
              ) : (
                <>
                  <Qr value={url} />
                  <p className="select-all break-all text-center font-mono text-sm">{url.replace(/^https:\/\//, "")}</p>
                  {viewersPill(mirror.viewers)}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="gap-2 rounded-2xl" onClick={() => void copy(url)}><Copy className="h-4 w-4" />{t("timerMirror.copy")}</Button>
                    {canShare
                      ? <Button variant="secondary" className="gap-2 rounded-2xl" onClick={() => void shareLink(url, t("timerMirror.pageTitle"))}><Share2 className="h-4 w-4" />{t("timerMirror.share")}</Button>
                      : <Button variant="secondary" className="gap-2 rounded-2xl" onClick={() => void renew()}><RefreshCw className="h-4 w-4" />{t("timerMirror.newCodeShort")}</Button>}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {canShare ? <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => void renew()}><RefreshCw className="h-4 w-4" />{t("timerMirror.newCodeShort")}</Button> : <span />}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => mirror.setOnline(false)}>{t("timerMirror.stop")}</Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {!localMirrorSupported() ? (
                <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">{t("timerMirror.localOnlyApp")}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{t("timerMirror.localHint")}</p>
                  {!mirror.prefs.local ? (
                    <Button className="h-12 w-full rounded-2xl text-[15px]" onClick={() => mirror.setLocalOn(true)}>{t("timerMirror.startLocal")}</Button>
                  ) : L.status === "starting" || L.status === "off" ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : L.status === "on" && localAddr ? (
                    <>
                      <Qr value={localAddr} />
                      <p className="select-all text-center font-mono text-2xl font-semibold tabular-nums">{localAddr.replace(/^http:\/\//, "")}</p>
                      {viewersPill(L.viewers)}
                    </>
                  ) : (
                    <div className="space-y-2 rounded-2xl bg-muted/60 p-3 text-sm">
                      <p>{t(L.status === "nowifi" ? "timerMirror.noWifi" : "timerMirror.localFailed")}</p>
                      <Button size="sm" variant="secondary" className="gap-1.5 rounded-full" onClick={mirror.retryLocal}><RefreshCw className="h-4 w-4" />{t("timerMirror.retry")}</Button>
                    </div>
                  )}
                  {mirror.prefs.local && (
                    <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-destructive" onClick={() => mirror.setLocalOn(false)}>{t("timerMirror.stop")}</Button></div>
                  )}
                </>
              )}
            </div>
          )}
          {mirror.active && <p className="mt-4 text-center text-xs text-muted-foreground">{t("timerMirror.keepOpen")}</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
