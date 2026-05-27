import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSuperVisitSummary } from "@/lib/visit-summary.functions";
import { deactivateScheduleEvent } from "@/lib/schedule-cleanup.functions";
import { VisitSummaryView, type VisitSnapshot } from "@/components/visit-summary/VisitSummaryView";
import { getHiddenEventIds, hideEventId } from "@/lib/hidden-events";
import { loadSnapshot, saveSnapshot } from "@/lib/snapshot-cache";

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
  const deactivateFn = useServerFn(deactivateScheduleEvent);
  const [snap, setSnap] = useState<VisitSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  // ID candidato a ser ocultado localmente (evento "fantasma" que persiste em cache).
  const [corruptId, setCorruptId] = useState<string | null>(null);
  // Bump força reaplicação do filtro de IDs ocultos sem refetch.
  const [hiddenBump, setHiddenBump] = useState(0);

  // Redireciona se não for superintendente — esta tela é exclusiva do super.
  useEffect(() => {
    if (role && role !== "superintendent") nav({ to: "/dashboard" });
  }, [role, nav]);

  const load = useCallback(
    async (congregationId: string) => {
      setLoading(true);
      // Hidratação imediata a partir do cache local (suporta offline / falha).
      const cached = loadSnapshot<VisitSnapshot>("resumo", congregationId);
      if (cached) setSnap(cached);
      try {
        const r = await fn({ data: { congregationId } });
        if (r.ok) {
          const fresh = r as unknown as VisitSnapshot;
          setSnap(fresh);
          saveSnapshot("resumo", congregationId, fresh);
          return fresh;
        }
        // resposta não-ok: mantém cache se existir
        if (!cached) setSnap(null);
        return cached ?? null;
      } catch (err) {
        console.warn("[resumo-semana] falha ao carregar — usando cache", err);
        if (!cached) setSnap(null);
        return cached ?? null;
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

  // Aplica o filtro local de IDs ocultos sobre o snapshot já carregado.
  // Não muta a referência original do `snap` — apenas deriva uma cópia segura.
  const filteredSnap = useMemo<VisitSnapshot | null>(() => {
    if (!snap) return null;
    const hidden = getHiddenEventIds();
    if (hidden.size === 0) return snap;
    return { ...snap, schedule: snap.schedule.filter((e) => !hidden.has(e.id)) };
    // hiddenBump força recomputação após hideEventId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, hiddenBump]);

  const handleEditEvent = useCallback(
    async (snapshotEventId: string) => {
      const circuitId = extractCircuitId(snapshotEventId);
      if (!circuitId) {
        // Evento veio de schedule_events (escopo da visita) — não é editável
        // pelo cronograma do circuito. Oferece ocultar localmente para limpar
        // resíduos de eventos antigos que persistem na visita ativa.
        setCorruptId(snapshotEventId);
        return;
      }

      const online = typeof navigator === "undefined" ? true : navigator.onLine;

      if (!online) {
        const stillExists = snap?.schedule.some((e) => e.id === snapshotEventId);
        if (!stillExists) {
          setCorruptId(snapshotEventId);
          return;
        }
        nav({ to: "/cronograma", search: { event: circuitId } as never });
        return;
      }

      if (!activeCong?.id) return;
      const fresh = await load(activeCong.id);
      const stillExists = fresh?.schedule.some((e) => e.id === snapshotEventId);
      if (!stillExists) {
        setCorruptId(snapshotEventId);
        return;
      }
      nav({ to: "/cronograma", search: { event: circuitId } as never });
    },
    [activeCong?.id, load, nav, snap],
  );

  const confirmHide = useCallback(async () => {
    if (!corruptId) return;
    const id = corruptId;
    // Sempre oculta localmente para feedback imediato.
    hideEventId(id);
    setCorruptId(null);
    setHiddenBump((n) => n + 1);

    // Se for evento da visita (UUID puro, sem prefixo cse_), também desativa
    // no servidor para que suma do acesso de anciãos/ESC. Falhas silenciosas
    // (offline / sem permissão) não bloqueiam o hide local.
    const circuitId = extractCircuitId(id);
    if (!circuitId) {
      try {
        const r = await deactivateFn({ data: { eventId: id } });
        if (r.ok) {
          toast.success(t("weekSummary.removedLocally"));
          if (activeCong?.id) load(activeCong.id);
          return;
        }
      } catch (err) {
        console.warn("[resumo-semana] deactivate falhou", err);
      }
    }
    toast.success(t("weekSummary.removedLocally"));
  }, [corruptId, t, deactivateFn, activeCong?.id, load]);

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

  if (loading || !filteredSnap) {
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
          {filteredSnap.congregation.name} • {t("weekSummary.subtitle")}
        </p>
      </div>
      <VisitSummaryView
        snap={filteredSnap}
        onRefresh={() => activeCong?.id && load(activeCong.id)}
        onEditEvent={handleEditEvent}
      />

      <AlertDialog open={!!corruptId} onOpenChange={(o) => !o && setCorruptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("weekSummary.corruptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("weekSummary.corruptConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHide}>
              {t("weekSummary.removeLocal")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
