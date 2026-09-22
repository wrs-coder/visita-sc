// Painel de estado da sincronização offline (Fase 4).
// Mostra última sincronização, pendências da fila e botão "Sincronizar agora".

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudOff, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeAutoSync, runAutoSync, type AutoSyncState } from "@/lib/local-auto-sync";
import { subscribe as subscribeQueue } from "@/lib/offline-queue";

export function SyncStatusCard() {
  const { t } = useTranslation();
  const [sync, setSync] = useState<AutoSyncState>(() => ({
    running: false,
    lastRunAt: null,
    lastOk: null,
    lastRows: 0,
    progress: null,
    error: null,
  }));
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => subscribeAutoSync(setSync), []);
  useEffect(() => subscribeQueue(setPending), []);
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

  const lastLabel = sync.lastRunAt
    ? new Date(sync.lastRunAt).toLocaleString()
    : t("sync.never", "Nunca");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {online ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <CloudOff className="h-4 w-4 text-amber-600" />
          )}
          {t("sync.title", "Sincronização offline")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sync.last", "Última sincronização")}</span>
          <span>{lastLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sync.pending", "Alterações pendentes")}</span>
          <span>{pending}</span>
        </div>
        {sync.progress && (
          <div className="text-muted-foreground">
            {t("sync.progress", "Baixando {{done}}/{{total}}", {
              done: sync.progress.done,
              total: sync.progress.total,
            })}
          </div>
        )}
        {sync.error && (
          <div className="text-destructive">
            {t("sync.error", "Falha em: {{tables}}", { tables: sync.error })}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={sync.running || !online}
          onClick={() => void runAutoSync({ force: true })}
        >
          {sync.running ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {sync.running ? t("sync.running", "Sincronizando…") : t("sync.now", "Sincronizar agora")}
        </Button>
      </CardContent>
    </Card>
  );
}
