import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import { Card, CardContent } from "@/components/ui/card";
import { getSuperVisitSummary } from "@/lib/visit-summary.functions";
import { VisitSummaryView, type VisitSnapshot } from "@/components/visit-summary/VisitSummaryView";

export const Route = createFileRoute("/_app/resumo-semana")({ component: Page });

function Page() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const activeCong = useActiveCongregation();
  const nav = useNavigate();
  const fn = useServerFn(getSuperVisitSummary);
  const [snap, setSnap] = useState<VisitSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Redireciona se não for superintendente — esta tela é exclusiva do super.
  useEffect(() => {
    if (role && role !== "superintendent") nav({ to: "/dashboard" });
  }, [role, nav]);

  const load = useCallback(async (congregationId: string) => {
    setLoading(true);
    try {
      const r = await fn({ data: { congregationId } });
      if (r.ok) setSnap(r as unknown as VisitSnapshot);
      else setSnap(null);
    } catch (err) {
      console.warn("[resumo-semana] falha ao carregar", err);
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [fn]);

  useEffect(() => {
    if (activeCong?.id) load(activeCong.id);
    else setLoading(false);
  }, [activeCong?.id, load]);

  if (!activeCong) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">{t("sidebar.weekSummary")}</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            {t("weekSummary.selectCongregation")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !snap) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t("sidebar.weekSummary")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {snap.congregation.name} • {t("weekSummary.subtitle")}
        </p>
      </div>
      <VisitSummaryView snap={snap} onRefresh={() => activeCong?.id && load(activeCong.id)} />
    </div>
  );
}
