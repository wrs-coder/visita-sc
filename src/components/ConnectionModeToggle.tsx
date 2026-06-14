import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff, CloudDownload, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useConnectionMode, setMode } from "@/lib/connection-mode";
import { prefetchAllForOffline, type ProgressEvent } from "@/lib/offline-prefetch";
import { isOfflinePrefetchFreshToday } from "@/hooks/use-offline-warmup";
import { queueSize, flushQueue } from "@/lib/offline-queue";
import { toast } from "sonner";

export function ConnectionModeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const mode = useConnectionMode();
  const [open, setOpen] = useState(false);

  const isOffline = mode === "offline";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t(isOffline ? "connection.switchToOnline" : "connection.switchToOffline")}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border transition",
          isOffline
            ? "bg-amber-500/15 border-amber-500/40 text-amber-100 hover:bg-amber-500/25"
            : "bg-emerald-500/15 border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25",
          className,
        )}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full shrink-0",
            isOffline ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
          )}
        />
        {isOffline ? (
          <WifiOff className="h-4 w-4 shrink-0" />
        ) : (
          <Wifi className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1 text-left font-semibold">
          {t(isOffline ? "connection.modeOffline" : "connection.modeOnline")}
        </span>
      </button>
      <ModeSwitchDialog open={open} onOpenChange={setOpen} current={mode} />
    </>
  );
}

function ModeSwitchDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: "online" | "offline";
}) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent>({
    step: 0,
    total: 0,
    label: "",
    errors: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const pending = queueSize();

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setProgress({ step: 0, total: 0, label: "", errors: 0 });
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const goingTo: "online" | "offline" = current === "online" ? "offline" : "online";

  const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;

  const switchToOffline = async () => {
    if (!user?.id) {
      toast.error(t("offline.requireLogin"));
      return;
    }
    // Missão 02 — gate diário: ativa offline direto se a pré-carga
    // do dia já existe; evita redownload desnecessário.
    if (isOfflinePrefetchFreshToday(user.id)) {
      setMode("offline");
      toast.success(t("connection.nowOffline"));
      onOpenChange(false);
      return;
    }
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const res = await prefetchAllForOffline({
        queryClient,
        userId: user.id,
        congregationId: null,
        role,
        signal: abortRef.current.signal,
        onProgress: setProgress,
        t,
      });
      setMode("offline");
      if (res.errors === 0) toast.success(t("connection.nowOffline"));
      else toast.warning(t("offline.partialToast", { n: res.errors }));
      onOpenChange(false);
    } catch (err) {
      console.error("[connection] switch offline falhou", err);
      // Mesmo se prefetch falhou, ainda assim ativamos offline com o cache existente.
      setMode("offline");
      toast.warning(t("connection.offlineWithStale"));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const switchToOnline = async () => {
    setBusy(true);
    try {
      // Primeiro libera o modo (interceptor desliga), depois empurra a fila.
      setMode("online");
      if (pending > 0) {
        const res = await flushQueue();
        if (res.sent > 0 && res.remaining === 0) {
          toast.success(t("sync.sent", { n: res.sent }));
        } else if (res.remaining > 0) {
          toast.warning(t("sync.remaining", { n: res.remaining }));
        }
      } else {
        toast.success(t("connection.nowOnline"));
      }
      try {
        await queryClient.invalidateQueries();
      } catch {
        /* noop */
      }
      onOpenChange(false);
    } catch (err) {
      console.warn("[connection] switch online falhou", err);
      toast.warning(t("sync.unstable"));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const title =
    goingTo === "offline"
      ? t("connection.confirmGoOfflineTitle")
      : t("connection.confirmGoOnlineTitle");
  const desc =
    goingTo === "offline"
      ? t("connection.confirmGoOfflineDesc")
      : t("connection.confirmGoOnlineDesc");

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {goingTo === "offline" ? (
              <WifiOff className="h-5 w-5 text-amber-500" />
            ) : (
              <Wifi className="h-5 w-5 text-emerald-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        {goingTo === "online" && pending > 0 && (
          <div className="flex items-center gap-2 text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            {t("connection.pendingToSync", { n: pending })}
          </div>
        )}

        {goingTo === "offline" && busy && (
          <div className="space-y-2 py-2">
            <Progress value={pct} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="truncate">{progress.label}</span>
              <span>
                {progress.step}/{progress.total}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          {goingTo === "offline" ? (
            <Button onClick={switchToOffline} disabled={busy} className="bg-amber-600 hover:bg-amber-700">
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4 mr-2" />
              )}
              {t("connection.activateOffline")}
            </Button>
          ) : (
            <Button onClick={switchToOnline} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              {t("connection.activateOnline")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
