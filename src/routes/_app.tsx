import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, CalendarDays, Users, UtensilsCrossed, ListChecks, Lock, LogOut, Menu, Building2, Car, FileStack, MapPin, UserCircle, Plane } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SyncButton } from "@/components/SyncButton";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, user, role, needsOnboarding, signOut, congregation, profile } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const redirectTo: string | null = !loading && !user
    ? "/"
    : !loading && needsOnboarding && location.pathname !== "/onboarding"
    ? "/onboarding"
    : !loading && role === "superintendent" && !congregation && location.pathname !== "/congregacoes"
    ? "/congregacoes"
    : null;

  useEffect(() => {
    if (redirectTo) nav({ to: redirectTo });
  }, [redirectTo, nav]);

  if (loading || redirectTo) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const items = [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
    { to: "/escala", label: "Estudos e Revisitas", icon: Users },
    { to: "/reunioes-de-campo", label: "Reuniões de Campo", icon: MapPin },
    { to: "/refeicoes", label: "Refeições", icon: UtensilsCrossed },
    { to: "/transporte", label: "Transporte", icon: Car },
    { to: "/checklist", label: "Checklist", icon: ListChecks },
    ...(role === "superintendent" ? [{ to: "/modelos", label: "Modelos de Programação", icon: FileStack }] : []),
    ...(role === "superintendent" ? [{ to: "/checklist-modelos", label: "Modelos de Checklist", icon: ListChecks }] : []),
    ...(role === "superintendent" ? [{ to: "/modelo-reunioes-de-campo", label: "Modelo Reuniões de Campo", icon: MapPin }] : []),
    ...(role === "superintendent" ? [{ to: "/notas", label: "Notas Privadas", icon: Lock }] : []),
    ...(role === "superintendent" ? [{ to: "/congregacoes", label: "Congregações", icon: Building2 }] : []),
    { to: "/configuracoes", label: "Itinerário", icon: Plane },
    { to: "/perfil", label: "Meu perfil", icon: UserCircle },
  ];

  const Nav = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = location.pathname === it.to || (it.to !== "/dashboard" && location.pathname.startsWith(it.to));
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} onClick={onClick}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <Icon className="h-4 w-4" /> {it.label}
          </Link>
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
                <button className="p-2 -ml-2 rounded-md hover:bg-white/10"><Menu className="h-5 w-5" /></button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-0 p-0 w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SidebarHeader congregationName={congregation?.name} userName={profile?.full_name ?? null} role={role} />
                <div className="p-3"><Nav /></div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="font-semibold text-sm truncate">{congregation?.name ?? "Visita"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SyncButton />
            <button onClick={() => { signOut().then(() => nav({ to: "/" })); }} className="p-2 rounded-md hover:bg-white/10" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground">
          <SidebarHeader congregationName={congregation?.name} userName={profile?.full_name ?? null} role={role} />
          <div className="p-3 flex-1 overflow-y-auto"><Nav /></div>
          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="px-1"><SyncButton className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60 px-3 py-2 rounded-md" /></div>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={() => signOut().then(() => nav({ to: "/" }))}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 md:ml-72 min-w-0">
          <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarHeader({ congregationName, userName, role }: { congregationName?: string; userName: string | null; role: string | null }) {
  return (
    <div className="p-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden"><Logo className="h-7 w-7" /></div>
        <div className="text-xs uppercase tracking-wider opacity-70">Visita do SC</div>
      </div>
      <div className="font-semibold leading-tight truncate">{congregationName ?? "Sem congregação"}</div>
      <div className="text-xs opacity-80 mt-1 truncate">{userName ?? ""}</div>
      <div className="mt-2 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15">
        {role === "superintendent" ? "Superintendente" : role === "elder" ? "Ancião" : "—"}
      </div>
    </div>
  );
}
