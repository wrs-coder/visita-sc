// Onda 7.4 — Badge "Pronto para offline" no header.
// Mostra progresso silencioso enquanto o warm-up roda e um ✓ verde
// quando termina. Tooltip explica o que está acontecendo.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudDownload, CloudCheck } from "lucide-react";
import { subscribeWarmup } from "@/hooks/use-offline-warmup";
import { cn } from "@/lib/utils";

export function OfflineReadyBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState({ running: false, percent: 0, done: false });

  useEffect(() => {
    return subscribeWarmup((s) => {
      const dataPct = s.progress ? (s.progress.step / Math.max(1, s.progress.total)) * 60 : 0;
      const shellsPct = s.shells ? (s.shells.step / Math.max(1, s.shells.total)) * 40 : 0;
      const percent = Math.min(100, Math.round(dataPct + shellsPct));
      setState({ running: s.running, percent, done: s.done });
    });
  }, []);

  // Esconde quando nem rodou ainda nem terminou (evita "piscar" no boot).
  if (!state.running && !state.done) return null;

  const label = state.done
    ? t("offlineReady.ready", { defaultValue: "Pronto para offline" })
    : t("offlineReady.preparing", { defaultValue: "Preparando offline… {{n}}%", n: state.percent });

  return (
    <span
      title={label}
      aria-label={label}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium",
        state.done ? "text-success" : "text-primary-foreground/85",
        className,
      )}
    >
      {state.done ? (
        <CloudCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <span className="relative inline-flex">
          <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
      {!state.done && state.running && (
        <span className="tabular-nums opacity-90">{state.percent}%</span>
      )}
    </span>
  );
}
