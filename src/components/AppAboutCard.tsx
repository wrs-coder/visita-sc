// "Sobre este app": versão das telas instaladas e acesso às novidades.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_VERSION } from "@/lib/app-update-check";
import { openWhatsNew } from "@/lib/whats-new";

type BuildInfo = { version?: string; builtAt?: string };

export function AppAboutCard() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    // build-info.json só existe dentro do APK (gerado com as telas).
    let cancelled = false;
    fetch("./build-info.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<BuildInfo>) : null))
      .then((d) => { if (!cancelled && d && typeof d.version === "string") setInfo(d); })
      .catch(() => { /* site ou APK antigo: sem carimbo */ });
    return () => { cancelled = true; };
  }, []);

  const when = info?.builtAt && !Number.isNaN(Date.parse(info.builtAt))
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(info.builtAt))
    : null;

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {t("about.title", "Sobre este app")}
          </div>
          <div className="text-sm mt-1">
            {t("about.version", "Versão {{v}}", { v: APP_VERSION })}
          </div>
          {info && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("about.screens", "Telas: {{v}}", { v: info.version })}
              {when ? ` · ${when}` : ""}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={openWhatsNew}>
          <Sparkles className="h-4 w-4 mr-1.5" aria-hidden />
          {t("about.whatsNew", "Ver novidades")}
        </Button>
      </CardContent>
    </Card>
  );
}
