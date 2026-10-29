// Estudo e Anotações do superintendente: Bíblia, Pesquisas e Anotações em pílulas.
// Bíblia/Pesquisas reutilizam o espaço da esposa com chave própria por usuário;
// Anotações reutilizam exatamente a tela de anotações que ficava em Esboços.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GuestWorkspace } from "@/components/guest-workspace/GuestWorkspace";
import { OutlinesWorkspace } from "@/components/outlines/OutlinesWorkspace";
import { wsUserKey } from "@/lib/guest-workspace-store";
import { cn } from "@/lib/utils";

type StudyTab = "bible" | "research" | "notes";
const TAB_KEY = "studyPersonal.tab";

export const Route = createFileRoute("/_app/estudo-pessoal")({
  validateSearch: (s: Record<string, unknown>): { tab?: StudyTab; noteId?: string } => ({
    tab: s.tab === "bible" || s.tab === "research" || s.tab === "notes" ? s.tab : undefined,
    noteId: typeof s.noteId === "string" ? s.noteId : undefined,
  }),
  beforeLoad: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!(roles ?? []).some((r) => r.role === "superintendent")) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  head: () => ({ meta: [
    { title: "Estudo e Anotações — Visita SC" },
    { name: "description", content: "Leitura da Bíblia, pesquisas pessoais e anotações de reuniões do superintendente." },
    { property: "og:title", content: "Estudo e Anotações — Visita SC" },
    { property: "og:description", content: "Leitura da Bíblia, pesquisas pessoais e anotações de reuniões do superintendente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StudyPage,
});

function StudyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<StudyTab>(search.tab ?? (search.noteId ? "notes" : "bible"));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (search.tab || search.noteId) return;
    try { const s = localStorage.getItem(TAB_KEY); if (s === "bible" || s === "research" || s === "notes") setTab(s); } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (v: StudyTab) => { setTab(v); try { localStorage.setItem(TAB_KEY, v); } catch { /* */ } };
  const consumed = useCallback(() => { void navigate({ to: "/estudo-pessoal", search: {}, replace: true }); }, [navigate]);

  const pills: Array<{ id: StudyTab; label: string }> = [
    { id: "bible", label: t("studyPersonal.bible", { defaultValue: "Bíblia" }) },
    { id: "research", label: t("studyPersonal.research", { defaultValue: "Pesquisas" }) },
    { id: "notes", label: t("studyPersonal.notes", { defaultValue: "Anotações" }) },
  ];

  return (
    <div className="space-y-3">
      <div className={cn("space-y-3", focused && "hidden lg:block")}>
        <header className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><GraduationCap className="h-5 w-5" /></div>
          <h1 className="flex-1 text-xl font-semibold">{t("sidebar.studyNotes", { defaultValue: "Estudo e Anotações" })}</h1>
        </header>
        <div role="tablist" className="flex w-full rounded-full border bg-background p-0.5">
          {pills.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={tab === p.id} onClick={() => choose(p.id)}
              className={cn("flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition", tab === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "notes" ? (
        <OutlinesWorkspace lockedType="talk_notes" search={{ noteId: search.noteId, mode: "edit" }}
          onSearchConsumed={consumed} onFocusChange={setFocused} />
      ) : user ? (
        <GuestWorkspace key={tab} section="study" fixedStudyTab={tab} storageKey={wsUserKey(user.id)} />
      ) : null}
    </div>
  );
}
