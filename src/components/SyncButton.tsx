import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { flushQueue, subscribe as subscribeQueue } from "@/lib/offline-queue";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LAST_SYNC_KEY = "visita-sc:last-sync";

export function SyncButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(LAST_SYNC_KEY);
    return v ? Number(v) : null;
  });

  const formatRelative = (ts: number | null): string => {
    if (!ts) return t("sync.never");
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("sync.now");
    if (min < 60) return t("sync.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("sync.hoursAgo", { n: h });
    return t("sync.daysAgo", { n: Math.floor(h / 24) });
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => subscribeQueue(setPending), []);

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await flushQueue();
      try { await queryClient.invalidateQueries(); } catch { /* offline read cache */ }
      const now = Date.now();
      try { localStorage.setItem(LAST_SYNC_KEY, String(now)); } catch { /* quota */ }
      setLastSync(now);
      if (res.aborted) {
        toast.warning(t("sync.unstable"));
      } else if (res.sent > 0 && res.remaining === 0) {
        toast.success(t("sync.sent", { n: res.sent }));
      } else if (res.remaining > 0) {
        toast.warning(t("sync.remaining", { n: res.remaining }));
      } else {
        toast.success(t("sync.updated"));
      }
    } catch (err) {
      console.warn("[sync] falha", err);
      toast.warning(t("sync.unstable"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={sync}
      disabled={syncing}
      title={`${t("sync.lastSync")}: ${formatRelative(lastSync)}${pending ? ` • ${pending} ${t("sync.pending")}` : ""}${online ? "" : ` • ${t("sync.offline")}`}`}
      className={cn(
        "relative inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium hover:bg-white/10 transition disabled:opacity-60",
        className,
      )}
      aria-label={t("sync.ariaSync")}
    >
      {online ? <Wifi className="h-3.5 w-3.5 opacity-70" /> : <WifiOff className="h-3.5 w-3.5 opacity-70" />}
      <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
      {pending > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center font-bold">
          {pending > 9 ? "9+" : pending}
        </span>
      )}
    </button>
  );
}
