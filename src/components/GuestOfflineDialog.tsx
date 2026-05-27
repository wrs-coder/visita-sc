import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CloudDownload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { prefetchRouteShells } from "@/lib/offline-shells";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { readGuestSession } from "@/lib/guest-session";
import { saveSnapshot } from "@/lib/snapshot-cache";
import { OFFLINE_READY_KEY } from "@/lib/offline-prefetch";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

type Phase = "idle" | "running" | "done" | "cancelled";

export function GuestOfflineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const fetchSnap = useServerFn(getGuestSnapshot);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ step: 0, total: 0, label: "", errors: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setProgress({ step: 0, total: 0, label: "", errors: 0 });
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;

  const start = async () => {
    const code = readGuestSession();
    if (!code) {
      toast.error(t("offline.requireLogin"));
      return;
    }
    abortRef.current = new AbortController();
    setPhase("running");
    let errors = 0;
    try {
      // 1) Snapshot do visitante (dados a exibir nas abas)
      setProgress({ step: 0, total: 2, label: t("offline.step.guestData"), errors });
      try {
        const r = await fetchSnap({ data: { inviteCode: code } });
        if ((r as { ok: boolean }).ok) {
          saveSnapshot("guest", code, r);
        } else {
          errors++;
        }
      } catch (e) {
        console.warn("[guest-offline] snapshot falhou", e);
        errors++;
      }

      // 2) Telas do app (shells de navegação)
      setProgress({ step: 1, total: 2, label: t("offline.step.shells"), errors });
      try {
        await prefetchRouteShells({
          signal: abortRef.current.signal,
          routes: ["/", "/visitante", "/visitante/painel"],
        });
      } catch (e) {
        console.warn("[guest-offline] shells falhou", e);
        errors++;
      }

      setProgress({ step: 2, total: 2, label: t("offline.done"), errors });

      try {
        localStorage.setItem(OFFLINE_READY_KEY, String(Date.now()));
      } catch {
        /* quota */
      }

      if (abortRef.current.signal.aborted) {
        setPhase("cancelled");
      } else {
        setPhase("done");
        if (errors === 0) toast.success(t("offline.doneToast"));
        else toast.warning(t("offline.partialToast", { n: errors }));
      }
    } catch (err) {
      console.error("[guest-offline] falha geral", err);
      toast.error(t("offline.failToast"));
      setPhase("idle");
    }
  };

  const cancel = () => abortRef.current?.abort();

  return (
    <Dialog open={open} onOpenChange={(v) => phase !== "running" && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className="h-5 w-5" /> {t("offline.modeTitle")}
          </DialogTitle>
          <DialogDescription>{t("offline.modeDesc")}</DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="text-sm text-muted-foreground py-2">{t("offline.modeHelp")}</div>
        )}

        {(phase === "running" || phase === "done" || phase === "cancelled") && (
          <div className="space-y-3 py-2">
            <Progress value={pct} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="truncate">
                {t("offline.syncing")}: {pct}% — {progress.label}
              </span>
              <span>{progress.step}/{progress.total}</span>
            </div>
            {progress.errors > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {t("offline.partial", { n: progress.errors })}
              </div>
            )}
            {phase === "done" && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {t("offline.done")}
              </div>
            )}
            {phase === "cancelled" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4" /> {t("offline.cancelled")}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button onClick={start}>
                <CloudDownload className="h-4 w-4 mr-2" /> {t("offline.start")}
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button variant="outline" onClick={cancel}>
              <X className="h-4 w-4 mr-2" /> {t("offline.cancel")}
            </Button>
          )}
          {(phase === "done" || phase === "cancelled") && (
            <Button onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
