import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Download,
  HardDrive,
  ListChecks,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listPending, retryNow, subscribeQueue, type QueuedMutation } from "@/lib/offline-queue";
import {
  getAutoSyncState,
  runAutoSync,
  runFullSync,
  subscribeAutoSync,
  type AutoSyncState,
} from "@/lib/local-auto-sync";

function formatRel(iso: string | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!iso) return t("sync.never", "nunca");
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return t("sync.now", "agora");
  if (min < 60) return t("sync.minutesAgo", "há {{n}} min", { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("sync.hoursAgo", "há {{n}} h", { n: h });
  return t("sync.daysAgo", "há {{n}} d", { n: Math.round(h / 24) });
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

const OP_LABELS: Record<QueuedMutation["op"], string> = {
  insert: "insert",
  update: "update",
  upsert: "upsert",
  delete: "delete",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function SyncStatusCard() {
  const { t } = useTranslation();
  const [state, setState] = useState<AutoSyncState>(getAutoSyncState());
  const [pending, setPending] = useState<QueuedMutation[]>(() => listPending());
  const [showPending, setShowPending] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => subscribeAutoSync(setState), []);
  useEffect(() => subscribeQueue(() => setPending(listPending())), []);

  // Etapa C — estimativa de armazenamento do navegador/app (best-effort).
  useEffect(() => {
    let alive = true;
    const estimate = async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (!alive || !est || typeof est.usage !== "number") return;
        setStorage({ usage: est.usage, quota: est.quota ?? 0 });
      } catch { /* não suportado */ }
    };
    void estimate();
    // Re-medir ao final de cada sincronização (após a limpeza silenciosa).
    const unsub = subscribeAutoSync((s) => { if (!s.running && s.lastRunAt) void estimate(); });
    return () => { alive = false; unsub(); };
  }, []);

  const downloadAll = async () => {
    const results = await runFullSync();
    if (!results) {
      if (!navigator.onLine) toast.error(t("sync.offline", "Offline"));
      return;
    }
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast.success(t("sync.downloadDone", "Download completo concluído"));
    } else {
      toast.error(t("sync.error", "Falha em: {{t}}", { t: failed.map((f) => f.table).join(", ") }));
    }
  };

  const retryItem = (id: string) => {
    if (retryNow(id)) toast(t("sync.retry", "Tentando enviar novamente…"));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {t("sync.title", "Sincronização offline")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground">
            <div>
              {t("sync.last", "Última sincronização")}: {formatRel(state.lastRunAt, t)}
              {state.lastOk && state.lastRows > 0 ? ` · ${state.lastRows}` : ""}
            </div>
            {pending.length > 0 && (
              <div className="text-amber-600 dark:text-amber-400">
                {pending.length} {t("sync.pending", "pendente(s)")}
              </div>
            )}
            {state.error && (
              <div className="text-destructive">
                {t("sync.error", "Falha em: {{t}}", { t: state.error })}
              </div>
            )}
            {state.progress && (
              <div>
                {state.progress.table} ({state.progress.done}/{state.progress.total})
              </div>
            )}
            {storage && storage.quota > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                {t("sync.storageUsed", "{{used}} MB de ~{{quota}} MB no aparelho", {
                  used: formatMB(storage.usage),
                  quota: Math.round(storage.quota / (1024 * 1024)),
                })}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={state.running}
            onClick={() => void runAutoSync({ force: true })}
          >
            <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${state.running ? "animate-spin" : ""}`} />
            {state.running ? t("sync.running", "Sincronizando…") : t("sync.now", "Sincronizar agora")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={state.running} onClick={() => void downloadAll()}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {t("sync.downloadAll", "Baixar tudo agora")}
          </Button>
          {pending.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowPending((v) => !v)}>
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />
              {t("sync.pendingTitle", "Alterações pendentes")}
              {showPending ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
          )}
        </div>

        {showPending && pending.length > 0 && (
          <ul className="space-y-1.5 rounded-md border p-2">
            {pending.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-medium">{it.table}</span>
                  <span className="text-muted-foreground"> · {OP_LABELS[it.op]} · {formatDate(it.createdAt)}</span>
                  {it.lastError && (
                    <div className="text-destructive flex items-center gap-1">
                      <CloudOff className="h-3 w-3 shrink-0" />
                      <span className="truncate">{it.lastError}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={() => retryItem(it.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
