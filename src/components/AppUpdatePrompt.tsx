// Aviso amigável de nova versão na Play Store — só no app instalado, com rede.
// Versão abaixo do mínimo suportado: aviso firme que reaparece a cada abertura.
// Atualização opcional: cartão discreto, "Agora não" esconde até o dia seguinte.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, X, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  checkForAppUpdate,
  dismissUpdateForToday,
  isUpdateDismissedToday,
  openPlayStore,
  type UpdateCheckResult,
} from "@/lib/app-update-check";

export function AppUpdatePrompt() {
  const { t } = useTranslation();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async (force = false) => {
      const r = await checkForAppUpdate({ force });
      if (cancelled || !r) return;
      if (!r.updateAvailable && !r.belowMinimum) return;
      if (!r.belowMinimum && isUpdateDismissedToday(r.latest)) return;
      setResult(r);
    };
    void run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!result || dismissed) return null;

  const firm = result.belowMinimum;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-[140] border-t border-border bg-card/95 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        {firm ? (
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <Download className="size-5 shrink-0 text-primary" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {firm
              ? t("appUpdate.requiredTitle", "Atualização importante")
              : t("appUpdate.availableTitle", "Nova versão disponível")}
          </p>
          <p className="text-xs text-muted-foreground">
            {firm
              ? t(
                  "appUpdate.requiredDesc",
                  "Sua versão ({{current}}) ficou antiga demais. Atualize para continuar com tudo funcionando.",
                  { current: result.current },
                )
              : t(
                  "appUpdate.availableDesc",
                  "A versão {{latest}} já está na Play Store.",
                  { latest: result.latest },
                )}
          </p>
        </div>
        <Button size="sm" onClick={() => openPlayStore()}>
          {t("appUpdate.updateNow", "Atualizar")}
        </Button>
        {!firm && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("appUpdate.later", "Agora não")}
            onClick={() => {
              dismissUpdateForToday(result.latest);
              setDismissed(true);
            }}
          >
            <X className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
