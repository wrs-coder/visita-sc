import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CloudDownload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { prefetchAllForOffline, type ProgressEvent } from "@/lib/offline-prefetch";
import { isOfflinePrefetchFreshToday } from "@/hooks/use-offline-warmup";
import { toast } from "sonner";

type Phase = "idle" | "running" | "done" | "cancelled";

export function OfflineModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ProgressEvent>({ step: 0, total: 0, label: "", errors: 0 });
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

  const start = async (force = false) => {
    if (!user?.id) {
      toast.error(t("offline.requireLogin"));
      return;
    }
    // Missão 02 — gate diário: se já há pré-carga do dia, fecha o diálogo
    // sem novo download. Botão "Forçar atualização" continua disponível.
    if (!force && isOfflinePrefetchFreshToday(null)) {
      toast.success(t("offline.alreadyFreshToday", { defaultValue: "Dados já atualizados hoje." }));
      setPhase("done");
      return;
    }
    abortRef.current = new AbortController();
    setPhase("running");
    try {
      const res = await prefetchAllForOffline({
        queryClient,
        userId: user.id,
        congregationId: null,
        role: role,
        signal: abortRef.current.signal,
        onProgress: setProgress,
        t,
      });
      if (res.aborted) {
        setPhase("cancelled");
      } else {
        setPhase("done");
        if (res.errors === 0) toast.success(t("offline.doneToast"));
        else toast.warning(t("offline.partialToast", { n: res.errors }));
      }
    } catch (err) {
      console.error("[offline-mode] falha geral", err);
      toast.error(t("offline.failToast"));
      setPhase("idle");
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

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
              <span>
                {progress.step}/{progress.total}
              </span>
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => start(false)}>
                <CloudDownload className="h-4 w-4 mr-2" /> {t("offline.start")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => start(true)} title={t("offline.forceRefresh", { defaultValue: "Forçar atualização" })}>
                {t("offline.forceRefresh", { defaultValue: "Forçar atualização" })}
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
