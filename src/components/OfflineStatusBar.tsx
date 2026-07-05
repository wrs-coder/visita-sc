// Barra de status offline premium — indicador discreto no topo do app.
// Estados: sincronizado / sincronizando (N/M) / offline com pendências / erro.
// 100% cliente, zero rede extra. Fonte: fila offline + navigator.onLine.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CloudOff, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { subscribe as subscribeQueue, subscribeFlushProgress } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

type Status = "synced" | "syncing" | "pending" | "error" | "session";

export function OfflineStatusBar() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState<{ total: number; done: number } | null>(null);
  const [sessionExpired] = useState(false);
  const [visible, setVisible] = useState(false);

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

  useEffect(() => {
    return subscribeFlushProgress((info) => {
      if (info.done < info.total) {
        setProgress(info);
      } else {
        // Termina — some após pequeno delay.
        setProgress(info);
        setTimeout(() => setProgress(null), 800);
      }
    });
  }, []);

  // Só mostra quando há algo interessante a comunicar.
  useEffect(() => {
    const active =
      !online || pending > 0 || progress !== null || sessionExpired;
    setVisible(active);
    if (!active) return;
    // Auto-hide "synced" após 3s.
    if (online && pending === 0 && !progress && !sessionExpired) {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [online, pending, progress, sessionExpired]);

  if (!visible) return null;

  const status: Status = sessionExpired
    ? "session"
    : progress && progress.done < progress.total
      ? "syncing"
      : !online && pending > 0
        ? "pending"
        : !online
          ? "pending"
          : pending > 0
            ? "pending"
            : "synced";

  const styles: Record<Status, { bg: string; icon: React.ReactNode; label: string }> = {
    synced: {
      bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: t("offline.status.synced", "Sincronizado"),
    },
    syncing: {
      bg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: progress
        ? t("offline.status.syncingProgress", "Sincronizando {{done}}/{{total}}", progress)
        : t("offline.status.syncing", "Sincronizando"),
    },
    pending: {
      bg: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
      icon: online ? <RefreshCw className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />,
      label: online
        ? t("offline.status.pending", "{{n}} pendente(s)", { n: pending })
        : t("offline.status.offlinePending", "Offline — {{n}} pendente(s)", { n: pending }),
    },
    error: {
      bg: "bg-destructive/10 text-destructive border-destructive/30",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t("offline.status.error", "Erro de sincronização"),
    },
    session: {
      bg: "bg-destructive/10 text-destructive border-destructive/30",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t("offline.status.sessionExpired", "Sessão expirada — faça login"),
    },
  };
  const s = styles[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-2 left-1/2 -translate-x-1/2 z-[60] pointer-events-none",
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
        "shadow-sm backdrop-blur-sm transition-opacity",
        s.bg,
      )}
    >
      {s.icon}
      <span>{s.label}</span>
    </div>
  );
}
