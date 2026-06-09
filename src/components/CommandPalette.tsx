import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, CalendarDays, Users, UtensilsCrossed, ListChecks, Lock,
  Building2, Car, FileStack, MapPin, UserCircle, Plane, ClipboardList,
  BookOpen, FileText, Heart, Trash2, Layers, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Entry = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "principal" | "visita" | "modelos";
  superOnly?: boolean;
};

/**
 * Command Palette global (⌘K / Ctrl+K). Reúne todas as rotas internas em uma
 * busca única — atalho perfeito em telas grandes, sem inflar o app
 * (cmdk já é dependência usada pelos componentes shadcn).
 *
 * Não consulta o banco: só atalhos de navegação.
 */
export function CommandPalette() {
  const { t } = useTranslation();
  const { role, user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isSuper = role === "superintendent";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entries: Entry[] = useMemo(() => [
    { to: "/dashboard", label: t("sidebar.home"), icon: LayoutDashboard, group: "principal" },
    { to: "/cronograma", label: t("sidebar.schedule"), icon: CalendarDays, group: "principal" },
    { to: "/configuracoes", label: t("sidebar.itinerary"), icon: Plane, group: "principal" },
    { to: "/congregacoes", label: t("sidebar.congregations"), icon: Building2, group: "principal", superOnly: true },
    { to: "/consideracoes-campo", label: t("sidebar.personalOutlines"), icon: FileText, group: "principal", superOnly: true },
    { to: "/notas", label: t("sidebar.privateNotes"), icon: Lock, group: "principal", superOnly: true },
    { to: "/lixeira", label: t("sidebar.trash", { defaultValue: "Lixeira" }), icon: Trash2, group: "principal", superOnly: true },

    { to: "/resumo-semana", label: t("sidebar.weekSummary"), icon: ClipboardList, group: "visita", superOnly: true },
    { to: "/comunicacao-casal", label: t("sidebar.coupleMessages"), icon: Heart, group: "visita", superOnly: true },
    { to: "/programa-ancioes", label: t("sidebar.elderProgram", { defaultValue: "Pastoreios, Recomendações e outros" }), icon: BookOpen, group: "visita" },
    { to: "/escala", label: t("sidebar.fieldStudies"), icon: Users, group: "visita" },
    { to: "/reunioes-discursos", label: t("sidebar.meetingsTalks"), icon: MapPin, group: "visita" },
    { to: "/refeicoes", label: t("sidebar.meals"), icon: UtensilsCrossed, group: "visita" },
    { to: "/transporte", label: t("sidebar.transport"), icon: Car, group: "visita" },
    { to: "/checklist", label: t("sidebar.checklist"), icon: ListChecks, group: "visita" },

    { to: "/modelos", label: t("sidebar.scheduleTemplates"), icon: FileStack, group: "modelos", superOnly: true },
    { to: "/checklist-modelos", label: t("sidebar.checklistTemplates"), icon: ListChecks, group: "modelos", superOnly: true },
    { to: "/modelo-reunioes-de-campo", label: t("sidebar.fieldMeetingTemplate"), icon: MapPin, group: "modelos", superOnly: true },
    { to: "/modelo-reunioes-discursos", label: t("sidebar.meetingTalkTemplates"), icon: Layers, group: "modelos", superOnly: true },
    { to: "/modelo-programacao-ancioes", label: t("sidebar.elderProgramTemplate", { defaultValue: "Modelo Programação Anciãos" }), icon: BookOpen, group: "modelos", superOnly: true },
    { to: "/perfil", label: t("sidebar.myProfile"), icon: UserCircle, group: "modelos" },
  ].filter((e) => !e.superOnly || isSuper), [t, isSuper]);

  if (loading || !user) return null;

  const groups: Array<{ id: Entry["group"]; label: string }> = [
    { id: "principal", label: t("sidebar.sectionPrincipal") },
    { id: "visita", label: t("sidebar.sectionVisita") },
    { id: "modelos", label: t("sidebar.sectionModelos") },
  ];

  const go = (to: string) => {
    setOpen(false);
    // pequena espera para o overlay fechar antes da navegação evitar flicker
    setTimeout(() => navigate({ to }), 30);
  };

  return (
    <>
      {/* Botão flutuante discreto (mobile e desktop) */}
      <button
        type="button"
        aria-label={t("commandPalette.open")}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("commandPalette.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
          {groups.map((g, idx) => {
            const items = entries.filter((e) => e.group === g.id);
            if (items.length === 0) return null;
            return (
              <div key={g.id}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={g.label}>
                  {items.map((e) => {
                    const Icon = e.icon;
                    return (
                      <CommandItem
                        key={e.to}
                        value={`${e.label} ${e.to}`}
                        onSelect={() => go(e.to)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{e.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
