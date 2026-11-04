import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CloudOff,
  HardDrive,
  ListChecks,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DEVICE_SYNC_EVENT, readDeviceSyncReport, runDeviceSync, type DeviceSyncReport } from "@/lib/device-sync";
import { isSimulatingBadNetwork, setSimulateBadNetwork } from "@/lib/net-policy";
import { localDbStats } from "@/lib/local-db";
import { MIRROR_ID_FIELD } from "@/lib/mirror-tables";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// Áreas mostradas no painel "Pronto para ficar sem internet".
const READY_AREAS: Array<{ key: string; label: string; tables: string[] }> = [
  { key: "dashboard", label: "Painel da visita", tables: ["meals", "field_meetings", "field_assignments", "transport_schedule", "checklist_items", "schedule_events", "midweek_meetings", "weekend_meetings"] },
  { key: "itinerary", label: "Itinerário e visitas", tables: ["visits", "itinerary_weeks", "circuit_schedule_events"] },
  { key: "congregations", label: "Congregações", tables: ["congregations"] },
  { key: "outlines", label: "Esboços e anotações", tables: ["personal_outlines", "private_notes"] },
  { key: "templates", label: "Modelos", tables: ["program_templates", "checklist_templates", "meeting_talk_templates"] },
  { key: "events", label: "Grandes Eventos", tables: ["circuit_big_events"] },
];
import {
  discardFailed,
  listFailed,
  listPending,
  retryFailed,
  retryNow,
  subscribe as subscribeQueue,
  subscribeFailed,
  type QueuedMutation,
} from "@/lib/offline-queue";
import {
  getAutoSyncState,
  subscribeAutoSync,
  type AutoSyncState,
} from "@/lib/local-auto-sync";

function formatRel(iso: string | null, t: TFunction): string {
  if (!iso) return t("sync.never", "nunca");
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return t("sync.now", "agora");
  if (min < 60) return t("sync.minutesAgo", { n: min, defaultValue: "há {{n}} min" });
  const h = Math.round(min / 60);
  if (h < 24) return t("sync.hoursAgo", { n: h, defaultValue: "há {{n}} h" });
  return t("sync.daysAgo", { n: Math.round(h / 24), defaultValue: "há {{n}} d" });
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
  const [failedItems, setFailedItems] = useState<QueuedMutation[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => subscribeAutoSync(setState), []);
  useEffect(() => subscribeQueue(() => setPending(listPending())), []);
  useEffect(() => subscribeFailed(() => setFailedItems(listFailed())), []);

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

  const [local, setLocal] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void localDbStats()
        .then((st) => {
          if (!alive) return;
          const m: Record<string, number> = {};
          for (const r of st.tables) m[r.table] = r.rows;
          setLocal(m);
        })
        .catch(() => undefined);
    load();
    const unsub = subscribeAutoSync((s) => { if (!s.running) load(); });
    window.addEventListener(DEVICE_SYNC_EVENT, load);
    return () => { alive = false; unsub(); window.removeEventListener(DEVICE_SYNC_EVENT, load); };
  }, []);
  const storedTables = local ? Object.keys(MIRROR_ID_FIELD).filter((tb) => tb in local).length : 0;
  const totalTables = Object.keys(MIRROR_ID_FIELD).length;

  const { user, role, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [report, setReport] = useState<DeviceSyncReport | null>(() => readDeviceSyncReport(user?.id));
  const [busy, setBusy] = useState(false);
  const [simulate, setSimulate] = useState(false);
  useEffect(() => {
    setReport(readDeviceSyncReport(user?.id));
    setSimulate(isSimulatingBadNetwork());
    const onReport = () => setReport(readDeviceSyncReport(user?.id));
    const onSim = () => setSimulate(isSimulatingBadNetwork());
    window.addEventListener(DEVICE_SYNC_EVENT, onReport);
    window.addEventListener("visita-sc:simulate-bad-net", onSim);
    return () => {
      window.removeEventListener(DEVICE_SYNC_EVENT, onReport);
      window.removeEventListener("visita-sc:simulate-bad-net", onSim);
    };
  }, [user?.id]);

  // Um único botão: envia o que foi salvo e baixa TUDO para o aparelho.
  const syncAll = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const r = await runDeviceSync({ queryClient, userId: user.id, role, t });
      await refresh().catch(() => undefined);
      const fails = r.tablesFailed.length + r.screensFailed;
      if (fails === 0 && r.remaining === 0) toast.success(t("sync.downloadDone", "Download completo concluído"));
      else toast.warning(t("sync.partial", { n: fails + r.remaining }));
    } catch {
      toast.warning(t("sync.unstable"));
    } finally {
      setBusy(false);
    }
  };
  const running = busy || state.running;

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
              {t("sync.last", "Última sincronização")}: {formatRel(report ? new Date(report.at).toISOString() : null, t)}
            </div>
            {pending.length > 0 && (
              <div className="text-amber-600 dark:text-amber-400">
                {pending.length} {t("sync.pending", "pendente(s)")}
              </div>
            )}
            {report && report.tablesFailed.length + report.screensFailed > 0 && (
              <div className="text-destructive">
                {t("sync.partial", { n: report.tablesFailed.length + report.screensFailed })}
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
          <Button size="sm" variant="outline" disabled={running} onClick={() => void syncAll()}>
            <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
            {running ? t("sync.running", "Sincronizando…") : t("sync.now", "Sincronizar agora")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowPending((v) => !v)}>
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />
              {t("sync.pendingTitle", "Alterações pendentes")}
              {showPending ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
          )}
        </div>

        {local && (
          <div className="rounded-md border p-2 space-y-1.5" aria-label={t("sync.readyTitle", "Pronto para ficar sem internet")}>
            <div className="text-sm font-medium">{t("sync.readyTitle", "Pronto para ficar sem internet")}</div>
            {READY_AREAS.map((a) => {
              const has = a.tables.some((tb) => tb in local);
              const n = a.tables.reduce((acc, tb) => acc + (local[tb] ?? 0), 0);
              return (
                <div key={a.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {has ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="truncate">{t(`sync.ready.${a.key}`, a.label)}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">{has ? `${n}` : t("sync.readyMissing", "não baixado")}</span>
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground">
              {t("sync.readyTables", "{{n}} de {{total}} partes guardadas no aparelho", { n: storedTables, total: totalTables })}
            </div>
            {storedTables < totalTables && (
              <div className="text-xs text-destructive">{t("sync.readyHint", "Toque em Sincronizar agora com internet para baixar o que falta.")}</div>
            )}
          </div>
        )}

        <label className="flex items-start justify-between gap-3 rounded-md border p-2">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t("sync.simulate")}</span>
            <span className="block text-xs text-muted-foreground">{t("sync.simulateDesc")}</span>
          </span>
          <Switch checked={simulate} onCheckedChange={(v) => setSimulateBadNetwork(v)} aria-label={t("sync.simulate")} />
        </label>

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

        {failedItems.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-destructive/40 p-2">
            <div className="text-xs font-medium text-destructive">
              {t("sync.failedTitle", "Não enviados")} ({failedItems.length})
            </div>
            <p className="text-xs text-muted-foreground">
              {t("sync.failedHint", "O servidor recusou estas alterações várias vezes. Tente de novo ou descarte.")}
            </p>
            <ul className="space-y-1.5">
              {failedItems.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-medium">{it.table}</span>
                    <span className="text-muted-foreground"> · {OP_LABELS[it.op]} · {formatDate(it.createdAt)}</span>
                    {it.lastError && <div className="truncate text-destructive">{it.lastError}</div>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" aria-label={t("sync.retryFailed", "Tentar de novo")} onClick={() => { if (retryFailed(it.id)) toast(t("sync.retry", "Tentando enviar novamente…")); }}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" aria-label={t("sync.discard", "Descartar")} onClick={() => { if (window.confirm(t("sync.discardConfirm", "Descartar esta alteração? Ela não será enviada."))) discardFailed(it.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
