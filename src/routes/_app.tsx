import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UtensilsCrossed,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  Building2,
  Car,
  FileStack,
  MapPin,
  UserCircle,
  Plane,
  ChevronDown,
  Layers,
  ClipboardList,
  BookOpen,
  FileText,
  Heart,
  Trash2,

} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SyncButton } from "@/components/SyncButton";
import { SupportDeveloperDialog } from "@/components/SupportDeveloper";
import { ConnectionModeToggle } from "@/components/ConnectionModeToggle";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { Coffee } from "lucide-react";
import { setActiveContext } from "@/lib/active-context";
import { useOutlinesSync } from "@/hooks/use-outlines-sync";


export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { id: string; label: string; items: NavItem[]; collapsible?: boolean };

function AppLayout() {
  const { loading, user, role, needsOnboarding, signOut, congregation, profile } = useAuth();
  const activeCong = useActiveCongregation();
  const nav = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // auto:false → o sync de Esboços Pessoais só roda sob demanda (botão de
  // sincronização, Salvar de uma nota ou diálogo de Nuvem). Edições locais
  // (criar, mover, reordenar, excluir) ficam apenas no aparelho até o
  // utilizador pedir para sincronizar.
  const syncOutlines = useOutlinesSync({ auto: false });


  const openSupport = () => {
    setMobileMenuOpen(false);
    // espera o Sheet fechar antes de abrir o Dialog (evita conflito de foco/overlay)
    setTimeout(() => setSupportOpen(true), 50);
  };

  // Fecha automaticamente o menu lateral em mobile ao trocar de rota.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Mantém o contexto ativo global em sincronia para a fila offline.
  useEffect(() => {
    setActiveContext({ congregationId: activeCong?.id ?? null, userId: user?.id ?? null });
  }, [activeCong?.id, user?.id]);

  const redirectTo: string | null =
    !loading && !user
      ? "/"
      : !loading && needsOnboarding && location.pathname !== "/onboarding"
        ? "/onboarding"
        : null;

  useEffect(() => {
    if (redirectTo) nav({ to: redirectTo });
  }, [redirectTo, nav]);

  if (loading || redirectTo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Bloqueio de membros comuns quando a congregação está inativa.
  const blocked = role !== "superintendent" && congregation && congregation.is_active === false;
  const displayedCongregationName =
    role === "superintendent" ? activeCong?.name : (activeCong?.name ?? congregation?.name);

  const sections: NavSection[] = [
    {
      id: "principal",
      label: t("sidebar.sectionPrincipal"),
      items: [
        { to: "/dashboard", label: t("sidebar.home"), icon: LayoutDashboard },
        { to: "/cronograma", label: t("sidebar.schedule"), icon: CalendarDays },
        { to: "/configuracoes", label: t("sidebar.itinerary"), icon: Plane },
        ...(role === "superintendent"
          ? [
              { to: "/congregacoes", label: t("sidebar.congregations"), icon: Building2 },
              { to: "/consideracoes-campo", label: t("sidebar.personalOutlines"), icon: FileText },
              { to: "/notas", label: t("sidebar.privateNotes"), icon: Lock },
              { to: "/lixeira", label: t("sidebar.trash", { defaultValue: "Lixeira" }), icon: Trash2 },
            ]
          : []),
      ],
    },
    {
      id: "visita",
      label: t("sidebar.sectionVisita"),
      items: [
        ...(role === "superintendent"
          ? [
              { to: "/resumo-semana", label: t("sidebar.weekSummary"), icon: ClipboardList },
              { to: "/comunicacao-casal", label: t("sidebar.coupleMessages"), icon: Heart },
            ]
          : []),
        { to: "/programa-ancioes", label: t("sidebar.elderProgram", { defaultValue: "Pastoreios, Recomendações e outros" }), icon: BookOpen },
        { to: "/escala", label: t("sidebar.fieldStudies"), icon: Users },
        { to: "/reunioes-discursos", label: t("sidebar.meetingsTalks"), icon: MapPin },
        { to: "/refeicoes", label: t("sidebar.meals"), icon: UtensilsCrossed },
        { to: "/transporte", label: t("sidebar.transport"), icon: Car },
        { to: "/checklist", label: t("sidebar.checklist"), icon: ListChecks },
      ],
    },


    {
      id: "modelos",
      label: t("sidebar.sectionModelos"),
      items: [
        ...(role === "superintendent"
          ? [
              { to: "/modelos", label: t("sidebar.scheduleTemplates"), icon: FileStack },
              { to: "/checklist-modelos", label: t("sidebar.checklistTemplates"), icon: ListChecks },
              { to: "/modelo-reunioes-de-campo", label: t("sidebar.fieldMeetingTemplate"), icon: MapPin },
              { to: "/modelo-reunioes-discursos", label: t("sidebar.meetingTalkTemplates"), icon: Layers },
              { to: "/modelo-programacao-ancioes", label: t("sidebar.elderProgramTemplate", { defaultValue: "Modelo Programação Anciãos" }), icon: BookOpen },
            ]
          : []),
        { to: "/perfil", label: t("sidebar.myProfile"), icon: UserCircle },
      ],
      collapsible: role === "superintendent",
    },
  ].filter((s) => s.items.length > 0);

  const isActiveLink = (to: string) =>
    location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));

  const LinkItem = ({ it, onClick }: { it: NavItem; onClick?: () => void }) => {
    const active = isActiveLink(it.to);
    const Icon = it.icon;
    return (
      <Link
        to={it.to}
        onClick={() => {
          // Navegação somente-cache: não dispara refetch ao Supabase.
          // Sync acontece apenas via botão "Sincronizar" ou pull-to-refresh.
          onClick?.();
        }}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4" /> {it.label}
      </Link>
    );
  };

  const Nav = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-5">
      {sections.map((sec) => {
        if (sec.collapsible) {
          // "Modelos de Base" — accordion com os 3 itens de modelos; perfil fica fora, abaixo.
          const modelItems = sec.items.filter((i) => i.to !== "/perfil");
          const perfil = sec.items.find((i) => i.to === "/perfil");
          const anyActive = modelItems.some((i) => isActiveLink(i.to));
          return (
            <div key={sec.id} className="space-y-1">
              <SectionLabel>{sec.label}</SectionLabel>
              {modelItems.length > 0 && (
                <Collapsible defaultOpen={anyActive}>
                  <CollapsibleTrigger
                    className={cn(
                      "group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition",
                      "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Layers className="h-4 w-4" /> {t("sidebar.baseTemplates")}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-3 mt-1 space-y-1">
                    {modelItems.map((it) => (
                      <LinkItem key={it.to} it={it} onClick={onClick} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
              {perfil && <LinkItem it={perfil} onClick={onClick} />}
              <button
                type="button"
                onClick={openSupport}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <Coffee className="h-4 w-4" /> {t("sidebar.supportDev")}
              </button>
            </div>
          );
        }
        const hasPerfil = sec.items.some((i) => i.to === "/perfil");
        return (
          <div key={sec.id} className="space-y-1">
            <SectionLabel>{sec.label}</SectionLabel>
            {sec.items.map((it) => (
              <LinkItem key={it.to} it={it} onClick={onClick} />
            ))}
            {hasPerfil && (
              <button
                type="button"
                onClick={openSupport}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <Coffee className="h-4 w-4" /> {t("sidebar.supportDev")}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Onda 6.6 — Skip-to-content (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-to-content">
        {t("a11y.skipToContent", { defaultValue: "Pular para o conteúdo" })}
      </a>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 -ml-2 rounded-md hover:bg-white/10"
                  aria-label={t("a11y.openMenu", { defaultValue: "Abrir menu de navegação" })}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-sidebar text-sidebar-foreground border-0 p-0 w-72 flex flex-col h-full"
              >
                <SheetTitle className="sr-only">{t("sidebar.menu")}</SheetTitle>
                <div className="shrink-0">
                  <SidebarHeader
                    congregationName={displayedCongregationName}
                    userName={profile?.full_name ?? null}
                    role={role}
                    circuit={profile?.circuit ?? null}
                  />
                </div>
                <div className="p-3 pb-0">
                  <ConnectionModeToggle />
                </div>
                <div className="p-3 flex-1 overflow-y-auto overscroll-contain">
                  <Nav onClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="font-semibold text-sm truncate">
                {displayedCongregationName ?? profile?.circuit ?? t("login.appTitle")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SyncButton onSync={syncOutlines} />
            <button
              onClick={() => {
                signOut().then(() => nav({ to: "/" }));
              }}
              className="p-2 rounded-md hover:bg-white/10"
              aria-label={t("sidebar.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground">
          <div className="shrink-0">
            <SidebarHeader
              congregationName={displayedCongregationName}
              userName={profile?.full_name ?? null}
              role={role}
              circuit={profile?.circuit ?? null}
            />
          </div>
          <div className="p-3 pb-0">
            <ConnectionModeToggle />
          </div>
          <div className="p-3 flex-1 overflow-y-auto overscroll-contain min-h-0">
            <Nav />
          </div>
          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="px-1">
              <SyncButton onSync={syncOutlines} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60 px-3 py-2 rounded-md" />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={() => signOut().then(() => nav({ to: "/" }))}
            >
              <LogOut className="mr-2 h-4 w-4" /> {t("sidebar.logout")}
            </Button>
          </div>
        </aside>

        <main className="flex-1 md:ml-72 min-w-0 max-w-full overflow-x-hidden">
          <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24 min-w-0">

            {blocked ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="max-w-md w-full border-primary/20">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Lock className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg font-semibold">{t("sidebar.blockedTitle")}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("sidebar.blockedDesc")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <ChunkErrorBoundary>
                <Outlet />
              </ChunkErrorBoundary>
            )}
          </div>
        </main>
      </div>
      <SupportDeveloperDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <CommandPalette />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
      {children}
    </div>
  );
}

function SidebarHeader({
  congregationName,
  userName,
  role,
  circuit,
}: {
  congregationName?: string;
  userName: string | null;
  role: string | null;
  circuit?: string | null;
}) {
  const { t } = useTranslation();
  const title =
    role === "superintendent"
      ? circuit?.trim() || congregationName || t("sidebar.circuitNotSet")
      : (congregationName ?? t("sidebar.noCongregation"));
  return (
    <div className="p-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden">
          <Logo className="h-7 w-7" />
        </div>
        <div className="text-xs uppercase tracking-wider opacity-70">{t("sidebar.appName")}</div>
      </div>
      <div className="font-semibold leading-tight truncate">{title}</div>
      {role === "superintendent" && congregationName && (
        <div className="text-[11px] opacity-75 mt-0.5 truncate">
          {t("sidebar.active")}: <span className="font-medium">{congregationName}</span>
        </div>
      )}
      <div className="text-xs opacity-80 mt-1 truncate">{userName ?? ""}</div>
      <div className="mt-2 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15">
        {role === "superintendent" ? t("sidebar.roleSuper") : role === "elder" ? t("sidebar.roleElder") : "—"}
      </div>
    </div>
  );
}
