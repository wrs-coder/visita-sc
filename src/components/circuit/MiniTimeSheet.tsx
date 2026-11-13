// Folha "Mini tempo": QR Code e link só da parte deste orador. Liga o espelho por internet
// se ainda estiver desligado, então o relógio do orador começa junto com o cronômetro.
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Share2, Timer as TimerIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { miniUrl } from "@/lib/big-events/timer-mirror";
import { mirrorOrigin } from "@/lib/big-events/timer-mirror-link";
import type { TimerPart } from "@/lib/big-events/event-timer";
import { Qr, shareLink } from "./TimerMirrorSheet";
import type { TimerMirrorApi } from "./use-timer-mirror";

export function MiniTimeSheet({ part, onClose, mirror }: { part: TimerPart | null; onClose: () => void; mirror: TimerMirrorApi }) {
  const { t } = useTranslation();
  const open = !!part;
  const { setOnline, prefs } = mirror;
  useEffect(() => { if (open && !prefs.online) setOnline(true); }, [open, prefs.online, setOnline]);
  if (!part) return null;
  const url = miniUrl(prefs.code, part.id, mirrorOrigin());
  const canShare = typeof navigator !== "undefined" && (Capacitor.isNativePlatform() || !!navigator.share);
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success(t("timerMirror.copied")); } catch { /* */ } };
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="dark max-h-[92vh] border-border bg-background text-foreground">
        <div className="overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="flex items-center gap-2 text-lg"><TimerIcon className="h-5 w-5 text-primary" />{t("timerMirror.miniTitle")}</DrawerTitle>
            <DrawerDescription>{t("timerMirror.miniSheetHint")}</DrawerDescription>
          </DrawerHeader>
          <div className="mb-3 rounded-2xl bg-muted/50 px-3 py-2.5">
            <p className="text-[15px] font-semibold leading-snug">{part.theme}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{[part.speaker_name, part.speaker_congregation].filter(Boolean).join(" · ")}</p>
          </div>
          <Qr value={url} />
          <p className="mt-3 select-all break-all text-center font-mono text-xs text-muted-foreground">{url.replace(/^https:\/\//, "")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="gap-2 rounded-2xl" onClick={() => void copy()}><Copy className="h-4 w-4" />{t("timerMirror.copy")}</Button>
            {canShare
              ? <Button variant="secondary" className="gap-2 rounded-2xl" onClick={() => void shareLink(url, t("timerMirror.miniTitle"))}><Share2 className="h-4 w-4" />{t("timerMirror.share")}</Button>
              : <Button variant="secondary" className="rounded-2xl" onClick={onClose}>OK</Button>}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("timerMirror.keepOpen")}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
