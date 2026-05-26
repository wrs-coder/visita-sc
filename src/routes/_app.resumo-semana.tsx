import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import { Card, CardContent } from "@/components/ui/card";
import { getSuperVisitSummary } from "@/lib/visit-summary.functions";
import { VisitSummaryView, type VisitSnapshot } from "@/components/visit-summary/VisitSummaryView";

export const Route = createFileRoute("/_app/resumo-semana")({ component: Page });

// O id de evento do cronograma do circuito vem prefixado com "cse_" no snapshot.
// Eventos da própria visita (schedule_events) não têm prefixo e não são editáveis
// pela aba de cronograma — o botão de edição só age sobre eventos do circuito.
function extractCircuitId(snapshotId: string): string | null {
  return snapshotId.startsWith("cse_") ? snapshotId.slice(4) : null;
}

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

  const load = useCallback(
    async (congregationId: string) => {
      setLoading(true);
      try {
        const r = await fn({ data: { congregationId } });
        if (r.ok) setSnap(r as unknown as VisitSnapshot);
        else setSnap(null);
        return r.ok ? (r as unknown as VisitSnapshot) : null;
      } catch (err) {
        console.warn("[resumo-semana] falha ao carregar", err);
        setSnap(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  // Sempre que abrir / voltar o foco, força refresh — evita eventos fantasmas em cache.
  useEffect(() => {
    if (!activeCong?.id) {
      setLoading(false);
      return;
    }
    load(activeCong.id);
    const onFocus = () => load(activeCong.id);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeCong?.id, load]);

  const handleEditEvent = useCallback(
    async (snapshotEventId: string) => {
      const circuitId = extractCircuitId(snapshotEventId);
      if (!circuitId) {
        toast.info(t("weekSummary.notEditableHere"));
        return;
      }

      const online = typeof navigator === "undefined" ? true : navigator.onLine;

      if (!online) {
        // Modo offline: confia no snapshot já em tela (não tenta network).
        const stillExists = snap?.schedule.some((e) => e.id === snapshotEventId);
        if (!stillExists) {
          toast.error(t("weekSummary.offlineUnavailable"));
          return;
        }
        nav({ to: "/cronograma", search: { event: circuitId } as never });
        return;
      }

      // Online: revalida no servidor (limpando cache) antes de navegar.
      if (!activeCong?.id) return;
      const fresh = await load(activeCong.id);
      const stillExists = fresh?.schedule.some((e) => e.id === snapshotEventId);
      if (!stillExists) {
        toast.error(t("weekSummary.eventGone"));
        return;
      }
      nav({ to: "/cronograma", search: { event: circuitId } as never });
    },
    [activeCong?.id, load, nav, snap, t],
  );

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
      <VisitSummaryView
        snap={snap}
        onRefresh={() => activeCong?.id && load(activeCong.id)}
        onEditEvent={handleEditEvent}
      />
    </div>
  );
}
