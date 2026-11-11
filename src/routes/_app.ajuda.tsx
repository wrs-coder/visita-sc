import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// O texto da Ajuda é em português; os rótulos citados vêm sempre do português
// para não misturar idiomas.
import pt from "@/i18n/locales/pt.json";
function ptLabel(key: string): string {
  let cur: unknown = pt;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}
function usePtT() {
  return ptLabel;
}
import { CalendarDays, ChevronDown, ChevronRight, Lock, Search, ArrowUpRight, KeyRound, ClipboardList, BookOpen, Mic, FileText, HelpCircle, Download, Upload, ShieldCheck, PlayCircle, X, UserCircle2, LayoutDashboard, FileStack, NotebookPen } from "lucide-react";
import { helpTopicsFor, OPEN_PALETTE_EVENT, searchHelp, type HelpTopic } from "@/lib/help/help-content";
import { cn } from "@/lib/utils";
import { TUTORIALS_URL } from "@/lib/tutorials";
import { EXTERNAL_LINK_PROPS, handleExternalLinkClick } from "@/lib/external-link";
import { useAuth } from "@/hooks/use-auth";
import { VISIT_PROGRAM_TABS } from "@/components/visit-week/VisitProgramTabs";

export const Route = createFileRoute("/_app/ajuda")({
  head: () => ({
    meta: [
      { title: "Ajuda — Visita SC" },
      { name: "description", content: "Passo a passo dos recursos do Visita SC, conferido com as telas do aplicativo." },
      { property: "og:title", content: "Ajuda — Visita SC" },
      { property: "og:description", content: "Passo a passo dos recursos do Visita SC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});



function PreviewCircuit() {
  const t = usePtT();
  return (
    <div aria-hidden className="rounded-2xl border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold">{t("circuit.fallbackTitle")}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-4 w-4" />
        </span>
      </div>
      <div className="flex gap-2">
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground">{t("sidebar.itinerary")}</span>
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-muted/40">{t("circuit.pillCircuit")}</span>
      </div>
    </div>
  );
}

function PreviewPin() {
  const t = usePtT();
  return (
    <div aria-hidden className="rounded-2xl border bg-background p-3 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <KeyRound className="h-4 w-4 text-primary" />
        {t("offlinePin.manageTitle")}
      </div>
      <p className="text-xs text-muted-foreground">{t("offlinePin.manageDescOff")}</p>
      <span className="inline-block rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">{t("offlinePin.create")}</span>
    </div>
  );
}

const ICONS = { lock: Lock, calendar: CalendarDays, week: ClipboardList, book: BookOpen, event: Mic, report: FileText, faq: HelpCircle, profile: UserCircle2, dashboard: LayoutDashboard, templates: FileStack, outline: NotebookPen } as const;

function Pills({ items, active = 0 }: { items: string[]; active?: number }) {
  return (
    <div aria-hidden className="rounded-2xl border bg-background p-3 flex flex-wrap gap-1.5">
      {items.map((x, i) => (
        <span key={x} className={cn("rounded-full border px-3 py-1 text-xs font-medium", i === active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground")}>{x}</span>
      ))}
    </div>
  );
}

function PreviewBackup() {
  const t = usePtT();
  return (
    <div aria-hidden className="rounded-2xl border bg-background p-3 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm"><ShieldCheck className="h-4 w-4 text-primary" />{t("profile.backupSection")}</div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"><Download className="h-3 w-3" />{t("profile.generateBackup")}</span>
        <span className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs"><Upload className="h-3 w-3" />{t("profile.restoreBackup")}</span>
      </div>
    </div>
  );
}

function TopicCard({ topic, open, onToggle }: { topic: HelpTopic; open: boolean; onToggle: () => void }) {
  const t = usePtT();
  const Icon = ICONS[topic.icon];
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 font-medium">{topic.title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      <div className={cn("px-4 pb-4 space-y-3", !open && "hidden")}>
        {topic.preview === "circuit-pills" && <PreviewCircuit />}
        {topic.preview === "pin-card" && <PreviewPin />}
        {topic.preview === "visit-pills" && <Pills items={VISIT_PROGRAM_TABS.map((x) => x.label)} />}
        {topic.preview === "reading-pills" && <Pills items={["Pessoal", "Família", "Reunião"]} />}
        {topic.preview === "event-pills" && <Pills items={["Eventos", "Modelos de carta"]} />}
        {topic.preview === "backup-card" && <PreviewBackup />}
        {topic.preview === "dashboard-pills" && <Pills items={[t("dashboard.pager.tabAgenda"), t("dashboard.pager.tabOutlines"), t("dashboard.pager.tabVisit"), t("dashboard.pager.tabPastoral")]} />}
        {topic.preview === "templates-pills" && <Pills items={[t("templates.program.studiesTitle"), t("templates.program.mealsTitle"), t("templates.program.transportTitle")]} />}
        {topic.preview === "outline-pills" && <Pills items={[t("personalOutlines.typePicker.field"), t("personalOutlines.typePicker.outline")]} />}
        {topic.preview === "notes-tabs" && <Pills items={["free", "pastoral", "s303", "oradores", "recomendados", "peticoes"].map((k) => t(`notes.categories.${k}.label`))} />}
        {topic.preview === "profile-pills" && <Pills items={[t("profile.tabPersonal"), t("profile.tabFeatures"), t("profile.tabSettings")]} />}
        <ol className="space-y-2 text-sm">
          {topic.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</span>
              <span>
                {s.before}
                {s.labelKey && <strong>“{t(s.labelKey)}”</strong>}
                {s.after}
              </span>
            </li>
          ))}
        </ol>
        <Link
          to={topic.route as never}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
        >
          Abrir esta tela <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function HelpPage() {
  const t = usePtT();
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const topics = useMemo(() => searchHelp(helpTopicsFor(role), query, (k) => t(k)), [query, t, role]);
  const searching = query.trim().length > 0;
  const router = useRouter();
  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ajuda</h1>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {role === "superintendent" && (
      <a
        href={TUTORIALS_URL}
        {...EXTERNAL_LINK_PROPS}
        onClick={(e) => handleExternalLinkClick(e, TUTORIALS_URL, "Precisa de internet para ver os vídeos.")}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-card active:scale-[0.99] transition"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><PlayCircle className="h-5 w-5" /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Vídeos tutoriais</span>
          <span className="block text-xs text-muted-foreground">Aprenda passo a passo no YouTube</span>
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </a>
      )}

      <label className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na ajuda (ex.: PIN)"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-card active:scale-[0.99] transition"
      >
        <Search className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-medium">Ir para uma tela ou ação</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ajuda</p>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        {topics.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
        ) : (
          topics.map((tp) => (
            <TopicCard
              key={tp.id}
              topic={tp}
              open={searching || openId === tp.id}
              onToggle={() => setOpenId((cur) => (cur === tp.id ? null : tp.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
