import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudDownload } from "lucide-react";
import { cn } from "@/lib/utils";
import { OfflineModeDialog } from "./OfflineModeDialog";
import { getOfflineReadyAt } from "@/lib/offline-prefetch";

export function OfflineModeButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [readyAt, setReadyAt] = useState<number | null>(() => getOfflineReadyAt());

  useEffect(() => {
    if (!open) setReadyAt(getOfflineReadyAt());
  }, [open]);

  const formatRel = (ts: number | null): string | null => {
    if (!ts) return null;
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return t("sync.now");
    if (diffMin < 60) return t("sync.minutesAgo", { n: diffMin });
    const h = Math.floor(diffMin / 60);
    if (h < 24) return t("sync.hoursAgo", { n: h });
    return t("sync.daysAgo", { n: Math.floor(h / 24) });
  };

  const rel = formatRel(readyAt);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={rel ? `${t("offline.lastSync")}: ${rel}` : t("offline.modeTitle")}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
          "bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent",
          className,
        )}
      >
        <CloudDownload className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{t("offline.activate")}</span>
        {rel && (
          <span className="text-[10px] opacity-70 truncate max-w-[80px]">{rel}</span>
        )}
      </button>
      <OfflineModeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
