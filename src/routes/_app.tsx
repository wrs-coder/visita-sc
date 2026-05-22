import { createFileRoute, Outlet, Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SyncButton } from "@/components/SyncButton";
import { setActiveContext } from "@/lib/active-context";

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
      label: "Principal",
      items: [
        { to: "/dashboard", label: "Início", icon: LayoutDashboard },
        { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
        { to: "/configuracoes", label: "Itinerário", icon: Plane },
        ...(role === "superintendent"
          ? [{ to: "/congregacoes", label: "Congregações", icon: Building2 }]
          : []),
      ],
    },
    {
      id: "visita",
      label: "Semana da Visita",
      items: [
        { to: "/escala", label: "Estudos e Revisitas", icon: Users },
        { to: "/reunioes-discursos", label: "Reuniões e Discursos", icon: MapPin },
        { to: "/refeicoes", label: "Refeições", icon: UtensilsCrossed },
        { to: "/transporte", label: "Transporte", icon: Car },
        { to: "/checklist", label: "Checklist", icon: ListChecks },
        ...(role === "superintendent"
          ? [{ to: "/notas", label: "Notas Privadas", icon: Lock }]
          : []),
      ],
    },
    {
      id: "modelos",
      label: "Modelos e Configurações",
      items: [
        ...(role === "superintendent"
          ? [
              { to: "/modelos", label: "Modelos de Programação", icon: FileStack },
              { to: "/checklist-modelos", label: "Modelos de Checklist", icon: ListChecks },
              { to: "/modelo-reunioes-de-campo", label: "Modelo Reuniões de Campo", icon: MapPin },
              { to: "/modelo-reunioes-discursos", label: "Modelos de Reunião e Discurso", icon: Layers },
            ]
          : []),
        { to: "/perfil", label: "Meu perfil", icon: UserCircle },
      ],
      collapsible: role === "superintendent",
    },
  ].filter((s) => s.items.length > 0);

  const isActiveLink = (to: string) =>
    location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));

  const router = useRouter();
  const queryClient = useQueryClient();
  const LinkItem = ({ it, onClick }: { it: NavItem; onClick?: () => void }) => {
    const active = isActiveLink(it.to);
    const Icon = it.icon;
    return (
      <Link
        to={it.to}
        onClick={() => {
          // Força refetch de queries e re-execução de loaders ao trocar de aba,
          // garantindo que o conteúdo da nova rota apareça imediatamente atualizado.
          queryClient.invalidateQueries();
          router.invalidate();
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
                      <Layers className="h-4 w-4" /> Modelos de Base
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
            </div>
          );
        }
        return (
          <div key={sec.id} className="space-y-1">
            <SectionLabel>{sec.label}</SectionLabel>
            {sec.items.map((it) => (
              <LinkItem key={it.to} it={it} onClick={onClick} />
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 -ml-2 rounded-md hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-sidebar text-sidebar-foreground border-0 p-0 w-72 flex flex-col h-full"
              >
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="shrink-0">
                  <SidebarHeader
                    congregationName={displayedCongregationName}
                    userName={profile?.full_name ?? null}
                    role={role}
                    circuit={profile?.circuit ?? null}
                  />
                </div>
                <div className="p-3 flex-1 overflow-y-auto overscroll-contain">
                  <Nav />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="font-semibold text-sm truncate">
                {displayedCongregationName ?? profile?.circuit ?? "Visita"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SyncButton />
            <button
              onClick={() => {
                signOut().then(() => nav({ to: "/" }));
              }}
              className="p-2 rounded-md hover:bg-white/10"
              aria-label="Sair"
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
          <div className="p-3 flex-1 overflow-y-auto overscroll-contain min-h-0">
            <Nav />
          </div>
          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="px-1">
              <SyncButton className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60 px-3 py-2 rounded-md" />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={() => signOut().then(() => nav({ to: "/" }))}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 md:ml-72 min-w-0">
          <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
            {blocked ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="max-w-md w-full border-primary/20">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Lock className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg font-semibold">Ainda não há novidades</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Por favor, aguarde até que o Superintendente disponibilize um agendamento de
                      visita.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
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
  const title =
    role === "superintendent"
      ? circuit?.trim() || congregationName || "Circuito não informado"
      : (congregationName ?? "Sem congregação");
  return (
    <div className="p-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden">
          <Logo className="h-7 w-7" />
        </div>
        <div className="text-xs uppercase tracking-wider opacity-70">Visita do SC</div>
      </div>
      <div className="font-semibold leading-tight truncate">{title}</div>
      {role === "superintendent" && congregationName && (
        <div className="text-[11px] opacity-75 mt-0.5 truncate">
          Ativa: <span className="font-medium">{congregationName}</span>
        </div>
      )}
      <div className="text-xs opacity-80 mt-1 truncate">{userName ?? ""}</div>
      <div className="mt-2 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15">
        {role === "superintendent" ? "Superintendente" : role === "elder" ? "Ancião" : "—"}
      </div>
    </div>
  );
}
