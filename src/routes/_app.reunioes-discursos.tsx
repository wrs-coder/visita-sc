import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  useActiveCongregation,
  getActiveCongregationOverride,
  setActiveCongregationOverride,
} from "@/hooks/use-active-congregation";
import { useServerFn } from "@tanstack/react-start";
import { listMyCongregations } from "@/lib/congregations.functions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  MeetingsDraftProvider,
  useMeetingsDraft,
} from "@/components/meetings/MeetingsDraftContext";
import { MeetingsTalksReportDialog } from "@/components/visit-week/MeetingsTalksReportDialog";
import { VisitWeekReportButton } from "@/components/visit-week/VisitWeekReportDialog";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { MeetingsEditModeProvider, useMeetingsEditMode } from "@/components/meetings/meetings-edit-mode";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";

// Lazy: cada painel só carrega quando o utilizador entra na respectiva aba.
const FieldMeetingsPanel = lazy(() =>
  import("@/components/meetings/FieldMeetingsPanel").then((m) => ({ default: m.FieldMeetingsPanel })),
);
const MidweekPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.MidweekPanel })),
);
const WeekendPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.WeekendPanel })),
);
const PioneerPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.PioneerPanel })),
);
const EldersServantsPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.EldersServantsPanel })),
);

export const Route = createFileRoute("/_app/reunioes-discursos")({ component: Page });

function PanelFallback() {
  // Skeleton no formato dos cards — sensação de carregamento bem mais leve
  // que um spinner centralizado. Custo: zero (CSS-only).
  return (
    <div className="space-y-3 mt-2" aria-busy="true" aria-live="polite">
      <div className="h-9 w-2/3 rounded-md bg-muted/60 animate-pulse" />
      <div className="rounded-lg border border-border/60 p-4 space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted/60 animate-pulse" />
        <div className="h-10 w-full rounded bg-muted/50 animate-pulse" />
        <div className="h-10 w-5/6 rounded bg-muted/50 animate-pulse" />
        <div className="h-24 w-full rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="rounded-lg border border-border/60 p-4 space-y-3">
        <div className="h-4 w-1/4 rounded bg-muted/60 animate-pulse" />
        <div className="h-10 w-full rounded bg-muted/50 animate-pulse" />
        <div className="h-10 w-4/6 rounded bg-muted/50 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Para o Superintendente: garante que sempre exista uma visita para a
 * congregação selecionada, criando uma "Programação geral" silenciosamente
 * caso ainda não exista nenhuma — assim os painéis abrem sem depender de
 * agendamento de calendário.
 */
function useEnsureVisitForSuper(congregationId: string | null, enabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || !congregationId) { setReady(false); return; }
    let cancelled = false;
    (async () => {
      setReady(false);
      const { data } = await supabase
        .from("visits").select("id").eq("congregation_id", congregationId).limit(1);
      if (cancelled) return;
      if (!data || data.length === 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        await supabase.from("visits").insert({
          congregation_id: congregationId,
          title: "Programação geral",
          start_date: today,
          end_date: today,
          is_active: true,
        });
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [congregationId, enabled]);
  return ready;
}

function SuperCongregationSelector() {
  const { t } = useTranslation();
  const fnList = useServerFn(listMyCongregations);
  const [congs, setCongs] = useState<{ id: string; name: string }[]>([]);
  const active = useActiveCongregation();
  const [value, setValue] = useState<string>(active?.id ?? "");

  useEffect(() => {
    (async () => {
      const res = await fnList();
      if (res.ok) setCongs((res.data as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
    })();
  }, [fnList]);

  useEffect(() => {
    const cur = getActiveCongregationOverride() ?? active?.id ?? "";
    setValue(cur);
  }, [active?.id]);

  const onChange = (id: string) => {
    setValue(id);
    setActiveCongregationOverride(id);
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium sm:min-w-[160px]">
          {t("meetingsTalks.selectedCongregation")}
        </div>
        <div className="flex-1">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={t("meetingsTalks.chooseCongregation")} /></SelectTrigger>
            <SelectContent>
              {congs.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscardDraftButton() {
  const { t } = useTranslation();
  const draft = useMeetingsDraft();
  const { canEdit } = useAuth();
  if (!draft || !canEdit) return null;
  const descKey = draft.pendingCount === 1
    ? "meetingsTalks.discardConfirmDescOne"
    : "meetingsTalks.discardConfirmDescMany";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={!draft.dirty || draft.saving}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t("meetingsTalks.discard")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("meetingsTalks.discardConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(descKey, { count: draft.pendingCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("meetingsTalks.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => draft.discardAll()}>
            {t("meetingsTalks.discard")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SaveDraftButton() {
  const { t } = useTranslation();
  const draft = useMeetingsDraft();
  const { canEdit } = useAuth();
  if (!draft || !canEdit) return null;
  return (
    <Button
      onClick={() => void draft.flush()}
      disabled={!draft.dirty || draft.saving}
      className="gap-2"
    >
      {draft.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {t("meetingsTalks.saveData")}
      {draft.dirty && !draft.saving && (
        <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-destructive" aria-label={t("meetingsTalks.pendingChangesAria")} />
      )}
    </Button>
  );
}

function SaveProgressBar() {
  const { t } = useTranslation();
  const draft = useMeetingsDraft();
  if (!draft || (!draft.saving && draft.progress === 0)) return null;
  return (
    <div className="space-y-1">
      <Progress value={draft.progress} />
      <div className="text-xs text-muted-foreground">
        {draft.saving ? t("meetingsTalks.syncing", { progress: draft.progress }) : t("meetingsTalks.synced")}
      </div>
    </div>
  );
}

function SyncStatusLine() {
  const { t } = useTranslation();
  const draft = useMeetingsDraft();
  if (!draft) return null;
  const { lastSyncedAt, lastFailedTables, dirty, saving } = draft;
  if (!lastSyncedAt && lastFailedTables.length === 0) return null;
  const hh = lastSyncedAt ? String(lastSyncedAt.getHours()).padStart(2, "0") : null;
  const mm = lastSyncedAt ? String(lastSyncedAt.getMinutes()).padStart(2, "0") : null;
  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      {lastSyncedAt && lastFailedTables.length === 0 && !dirty && !saving && (
        <span className="text-emerald-600 dark:text-emerald-400">
          {t("meetingsTalks.lastSync", { time: `${hh}:${mm}` })}
        </span>
      )}
      {lastFailedTables.length > 0 && (
        <span className="text-destructive text-right">
          {t("meetingsTalks.syncFail", { tables: lastFailedTables.join(", ") })}
        </span>
      )}
    </div>
  );
}

function SupervisorEditModeBar() {
  const { editEnabled, setEditEnabled } = useMeetingsEditMode();
  return <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />;
}

function Page() {
  const { role, user } = useAuth();
  const isSuper = role === "superintendent";
  const active = useActiveCongregation();
  const ready = useEnsureVisitForSuper(active?.id ?? null, isSuper);
  const panelsReady = !isSuper || ready;
  const scopeKey = `${user?.id ?? "anon"}:${active?.id ?? "none"}`;
  const [currentTab, setCurrentTab] = useState("campo");

  return (
    <MeetingsDraftProvider scopeKey={scopeKey}>
      <MeetingsEditModeProvider isSuper={isSuper}>
        <TabsGuarded
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isSuper={isSuper}
          panelsReady={panelsReady}
        />
      </MeetingsEditModeProvider>
    </MeetingsDraftProvider>
  );
}

function TabsGuarded({
  currentTab,
  setCurrentTab,
  isSuper,
  panelsReady,
}: {
  currentTab: string;
  setCurrentTab: (v: string) => void;
  isSuper: boolean;
  panelsReady: boolean;
}) {
  const { t } = useTranslation();
  const draft = useMeetingsDraft();
  const { visit } = useActiveVisit();
  const { editEnabled, setEditEnabled } = useMeetingsEditMode();
  const [reportOpen, setReportOpen] = useState(false);
  const handleTabChange = (v: string) => {
    if (draft?.dirty) {
      const ok = window.confirm(t("meetingsTalks.unsavedConfirm"));
      if (!ok) return;
    }
    setCurrentTab(v);
  };

  // Atalhos de teclado: 1–5 troca de aba; "E" alterna modo edição (apenas SC).
  // Ignora quando o foco está em campo de texto para não atrapalhar digitação.
  useEffect(() => {
    const TAB_KEYS: Record<string, string> = {
      "1": "campo", "2": "meio", "3": "fim", "4": "pioneiros", "5": "ancios",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tgt?.isContentEditable) return;
      const tab = TAB_KEYS[e.key];
      if (tab) { e.preventDefault(); handleTabChange(tab); return; }
      if (isSuper && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setEditEnabled(!editEnabled);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper, editEnabled, draft?.dirty]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("meetingsTalks.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("meetingsTalks.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <VisitWeekReportButton onClick={() => setReportOpen(true)} />
            <DiscardDraftButton />
            <SaveDraftButton />
          </div>
          <SyncStatusLine />
        </div>
      </div>

      <SaveProgressBar />

      {isSuper && <SuperCongregationSelector />}
      {isSuper && <SupervisorEditModeBar />}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full gap-1 bg-transparent p-0">
          <TabsTrigger value="campo" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">{t("meetingsTalks.tabCampo")}</TabsTrigger>
          <TabsTrigger value="meio" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">{t("meetingsTalks.tabMeio")}</TabsTrigger>
          <TabsTrigger value="fim" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">{t("meetingsTalks.tabFim")}</TabsTrigger>
          <TabsTrigger value="pioneiros" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">{t("meetingsTalks.tabPioneiros")}</TabsTrigger>
          <TabsTrigger value="ancios" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">{t("meetingsTalks.tabAncios")}</TabsTrigger>
        </TabsList>
        {panelsReady ? (
          <>
            <TabsContent value="campo" className="mt-4 tab-fade-in"><TabErrorBoundary label={t("meetingsTalks.tabCampo")}><Suspense fallback={<PanelFallback />}><FieldMeetingsPanel /></Suspense></TabErrorBoundary></TabsContent>
            <TabsContent value="meio" className="mt-4 tab-fade-in"><TabErrorBoundary label={t("meetingsTalks.tabMeio")}><Suspense fallback={<PanelFallback />}><MidweekPanel /></Suspense></TabErrorBoundary></TabsContent>
            <TabsContent value="fim" className="mt-4 tab-fade-in"><TabErrorBoundary label={t("meetingsTalks.tabFim")}><Suspense fallback={<PanelFallback />}><WeekendPanel /></Suspense></TabErrorBoundary></TabsContent>
            <TabsContent value="pioneiros" className="mt-4 tab-fade-in"><TabErrorBoundary label={t("meetingsTalks.tabPioneiros")}><Suspense fallback={<PanelFallback />}><PioneerPanel /></Suspense></TabErrorBoundary></TabsContent>
            <TabsContent value="ancios" className="mt-4 tab-fade-in"><TabErrorBoundary label={t("meetingsTalks.tabAncios")}><Suspense fallback={<PanelFallback />}><EldersServantsPanel /></Suspense></TabErrorBoundary></TabsContent>
          </>
        ) : (
          <PanelFallback />
        )}
      </Tabs>

      {visit && (
        <MeetingsTalksReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          visitId={visit.id}
          visitTitle={visit.title}
        />
      )}
    </div>
  );
}

