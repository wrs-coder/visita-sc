// Aviso de sincronização (pendências / sem internet / enviando).
// Não flutua mais no topo (cobria Ajuda e Sincronizar): aparece como
// bloco no menu lateral (ao lado de "Escuro"/"Preto") e como linha
// informativa no painel "Pastas e configurações" da esposa.
// 100% cliente, zero rede extra. Fonte: fila offline + navigator.onLine.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { subscribe as subscribeQueue, subscribeFlushProgress, flushQueue } from "@/lib/offline-queue";
import { getLastWarmupAt } from "@/lib/offline-prefetch";
import { cn } from "@/lib/utils";

export type OfflineStatusKind = "synced" | "syncing" | "pending" | "offline";

export interface OfflineStatus {
  visible: boolean;
  kind: OfflineStatusKind;
  online: boolean;
  pending: number;
  /** Texto curto para o bloco do menu lateral. */
  short: string;
  /** Texto completo para a linha informativa. */
  long: string;
  canSend: boolean;
}

export function useOfflineStatus(): OfflineStatus {
  const { t } = useTranslation();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState<{ total: number; done: number } | null>(null);
  const [showSynced, setShowSynced] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => { setLastAt(getLastWarmupAt()); }, [online]);
  useEffect(() => subscribeQueue(setPending), []);
  useEffect(() => subscribeFlushProgress((info) => {
    setProgress(info);
    if (info.done >= info.total) {
      setShowSynced(true);
      window.setTimeout(() => { setProgress(null); }, 800);
      window.setTimeout(() => setShowSynced(false), 3000);
    }
  }), []);

  const syncing = !!progress && progress.done < progress.total;
  const kind: OfflineStatusKind = syncing ? "syncing" : !online ? "offline" : pending > 0 ? "pending" : "synced";
  const visible = kind !== "synced" || showSynced;

  let short = t("offline.status.synced", "Sincronizado");
  let long = short;
  if (kind === "syncing" && progress) {
    short = `${progress.done}/${progress.total}`;
    long = t("offline.status.syncingProgress", "Sincronizando {{done}}/{{total}}", progress);
  } else if (kind === "offline") {
    short = pending > 0 ? t("offline.status.pendingShort", "{{n}} pendente(s)", { n: pending }) : t("offline.status.noInternetShort", "Sem internet");
    long = pending > 0
      ? t("offline.status.offlinePending", "Offline — {{n}} pendente(s)", { n: pending })
      : `${t("offline.status.noInternetShort", "Sem internet")}${lastAt ? ` — ${t("offline.status.dataFrom", "dados de {{when}}", { when: ageLabel(lastAt) })}` : ""}`;
  } else if (kind === "pending") {
    short = t("offline.status.pendingShort", "{{n}} pendente(s)", { n: pending });
    long = t("offline.status.pending", "{{n}} pendente(s)", { n: pending });
  }

  return { visible, kind, online, pending, short, long, canSend: online && pending > 0 && kind === "pending" };
}

function Icon({ kind, className }: { kind: OfflineStatusKind; className?: string }) {
  if (kind === "syncing") return <Loader2 className={cn(className, "animate-spin")} />;
  if (kind === "offline") return <CloudOff className={className} />;
  if (kind === "pending") return <RefreshCw className={className} />;
  return <CheckCircle2 className={className} />;
}

const TONE: Record<OfflineStatusKind, string> = {
  synced: "border-success/40 bg-success/15 text-sidebar-foreground",
  syncing: "border-primary/40 bg-primary/15 text-sidebar-foreground",
  pending: "border-warning/60 bg-warning/20 text-sidebar-foreground",
  offline: "border-warning/60 bg-warning/20 text-sidebar-foreground",
};

/** Bloco do menu lateral, na mesma linha de "Escuro" e "Preto". */
export function OfflineStatusTile() {
  const { t } = useTranslation();
  const s = useOfflineStatus();
  if (!s.visible) return <div aria-hidden="true" />;
  const label = s.canSend ? `${s.long} · ${t("offline.status.tapToSend", "tocar para enviar")}` : s.long;
  const cls = cn(
    "flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-[11px] font-semibold leading-tight min-w-0 px-1 text-center",
    TONE[s.kind],
  );
  const body = (
    <>
      <Icon kind={s.kind} className="h-4 w-4" />
      <span className="truncate max-w-full">{s.short}</span>
      {s.canSend && <span className="text-[10px] font-normal opacity-80">{t("offline.status.sendShort", "Enviar")}</span>}
    </>
  );
  return s.canSend ? (
    <button type="button" role="status" aria-live="polite" aria-label={label} title={label} onClick={() => void flushQueue()} className={cn(cls, "active:scale-[0.97] transition")}>
      {body}
    </button>
  ) : (
    <div role="status" aria-live="polite" aria-label={label} title={label} className={cls}>{body}</div>
  );
}

/** Linha só informativa (painel da esposa / anciãos). */
export function OfflineStatusInfo({ className }: { className?: string }) {
  const { t } = useTranslation();
  const s = useOfflineStatus();
  if (!s.visible) return null;
  return (
    <div role="status" aria-live="polite" className={cn("flex items-start gap-2 rounded-2xl border p-3 text-xs", TONE[s.kind].replace("text-sidebar-foreground", "text-foreground"), className)}>
      <Icon kind={s.kind} className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="font-semibold">{s.long}</div>
        {s.kind === "offline" && <div className="text-muted-foreground">{t("offline.status.savedHere", "Seus dados estão salvos neste aparelho.")}</div>}
      </div>
    </div>
  );
}

/** Bolinha discreta no botão ☰ quando há aviso a ver no menu. */
export function useOfflineAttention(): boolean {
  const s = useOfflineStatus();
  return s.kind === "pending" || s.kind === "offline";
}

function ageLabel(at: number): string {
  const min = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h atrás`;
  return `${Math.round(h / 24)} dia(s) atrás`;
}
