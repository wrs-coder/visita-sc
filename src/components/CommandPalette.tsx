import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, CalendarDays, Users, UtensilsCrossed, ListChecks, Lock,
  Building2, Car, FileStack, MapPin, UserCircle, Plane, ClipboardList,
  BookOpen, FileText, Heart, Trash2, Layers, Search, RefreshCw, Sun, Moon,
  Languages, LogOut, Coffee, Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import { useOutlinesSync } from "@/hooks/use-outlines-sync";
import { prefetchAllForOffline } from "@/lib/offline-prefetch";
import { changeLanguage, type SupportedLanguage } from "@/i18n";
import { SupportDeveloperDialog } from "@/components/SupportDeveloper";
import { toast } from "sonner";

type NavEntry = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "principal" | "visita" | "modelos";
  superOnly?: boolean;
};

const RECENT_KEY = "visita-sc:cmdk-recents";
const RECENT_MAX = 5;

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(path: string) {
  if (typeof window === "undefined") return;
  // Ignora rotas fora de /_app e a própria home pública.
  if (!path || path === "/" || path.startsWith("/visitante") || path.startsWith("/onboarding")) return;
  try {
    const cur = loadRecents().filter((p) => p !== path);
    cur.unshift(path);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX)));
  } catch {
    /* quota */
  }
}

/**
 * Command Palette global (⌘K / Ctrl+K).
 *
 * Onda 7.7 — expandida:
 *  - Recentes (últimas rotas visitadas, persistidas em localStorage).
 *  - Ações rápidas: sincronizar, alternar tema, trocar idioma, apoiar,
 *    sair (com proteção em Modo Offline via signOut do AuthProvider).
 *  - Navegação completa por seção (igual à sidebar) — sem consultar o banco.
 *  - Shortcut hints à direita para ações principais.
 */
export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const { role, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [, setTheme] = useTheme();
  const activeCong = useActiveCongregation();
  const syncOutlines = useOutlinesSync({ auto: false });

  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => loadRecents());

  const isSuper = role === "superintendent";

  // Hotkey ⌘K / Ctrl+K
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

  // Recents: registra navegações do utilizador.
  useEffect(() => {
    pushRecent(location.pathname);
    setRecents(loadRecents());
  }, [location.pathname]);

  const entries: NavEntry[] = useMemo(() => ([
    { to: "/dashboard", label: t("sidebar.home"), icon: LayoutDashboard, group: "principal" as const },
    { to: "/cronograma", label: t("sidebar.schedule"), icon: CalendarDays, group: "principal" as const },
    { to: "/configuracoes", label: t("sidebar.itinerary"), icon: Plane, group: "principal" as const },
    { to: "/congregacoes", label: t("sidebar.congregations"), icon: Building2, group: "principal" as const, superOnly: true },
    { to: "/consideracoes-campo", label: t("sidebar.personalOutlines"), icon: FileText, group: "principal" as const, superOnly: true },
    { to: "/notas", label: t("sidebar.privateNotes"), icon: Lock, group: "principal" as const, superOnly: true },
    { to: "/lixeira", label: t("sidebar.trash", { defaultValue: "Lixeira" }), icon: Trash2, group: "principal" as const, superOnly: true },

    { to: "/resumo-semana", label: t("sidebar.weekSummary"), icon: ClipboardList, group: "visita" as const, superOnly: true },
    { to: "/comunicacao-casal", label: t("sidebar.coupleMessages"), icon: Heart, group: "visita" as const, superOnly: true },
    { to: "/programa-ancioes", label: t("sidebar.elderProgram", { defaultValue: "Pastoreios, Recomendações e outros" }), icon: BookOpen, group: "visita" as const },
    { to: "/escala", label: t("sidebar.fieldStudies"), icon: Users, group: "visita" as const },
    { to: "/reunioes-discursos", label: t("sidebar.meetingsTalks"), icon: MapPin, group: "visita" as const },
    { to: "/refeicoes", label: t("sidebar.meals"), icon: UtensilsCrossed, group: "visita" as const },
    { to: "/transporte", label: t("sidebar.transport"), icon: Car, group: "visita" as const },
    { to: "/checklist", label: t("sidebar.checklist"), icon: ListChecks, group: "visita" as const },

    { to: "/modelos", label: t("sidebar.scheduleTemplates"), icon: FileStack, group: "modelos" as const, superOnly: true },
    { to: "/checklist-modelos", label: t("sidebar.checklistTemplates"), icon: ListChecks, group: "modelos" as const, superOnly: true },
    { to: "/modelo-reunioes-de-campo", label: t("sidebar.fieldMeetingTemplate"), icon: MapPin, group: "modelos" as const, superOnly: true },
    { to: "/modelo-reunioes-discursos", label: t("sidebar.meetingTalkTemplates"), icon: Layers, group: "modelos" as const, superOnly: true },
    { to: "/modelo-programacao-ancioes", label: t("sidebar.elderProgramTemplate", { defaultValue: "Modelo Programação Anciãos" }), icon: BookOpen, group: "modelos" as const, superOnly: true },
    { to: "/perfil", label: t("sidebar.myProfile"), icon: UserCircle, group: "modelos" as const },
  ] satisfies NavEntry[]).filter((e) => !e.superOnly || isSuper), [t, isSuper]);

  const entryByPath = useMemo(() => {
    const m = new Map<string, NavEntry>();
    for (const e of entries) m.set(e.to, e);
    return m;
  }, [entries]);

  if (loading || !user) return null;

  const groups: Array<{ id: NavEntry["group"]; label: string }> = [
    { id: "principal", label: t("sidebar.sectionPrincipal") },
    { id: "visita", label: t("sidebar.sectionVisita") },
    { id: "modelos", label: t("sidebar.sectionModelos") },
  ];

  const close = () => setOpen(false);
  const run = (fn: () => void | Promise<void>) => {
    close();
    // pequena espera para o overlay fechar antes de executar a ação (evita flicker/focus)
    setTimeout(() => { void fn(); }, 30);
  };
  const go = (to: string) => run(() => navigate({ to: to as never }));

  const syncNow = async () => {
    try {
      await syncOutlines();
      if (user?.id) {
        await prefetchAllForOffline({
          queryClient: qc,
          userId: user.id,
          congregationId: activeCong?.id ?? null,
          role: role ?? null,
          t: (k) => t(k),
        });
      }
      toast.success(t("sync.done", { defaultValue: "Sincronizado" }));
    } catch {
      toast.error(t("sync.error", { defaultValue: "Falha ao sincronizar" }));
    }
  };

  const recentEntries = recents
    .map((p) => entryByPath.get(p))
    .filter((x): x is NavEntry => !!x)
    .filter((e) => e.to !== location.pathname)
    .slice(0, RECENT_MAX);

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

          {recentEntries.length > 0 && (
            <>
              <CommandGroup heading={t("commandPalette.sectionRecent")}>
                {recentEntries.map((e) => {
                  const Icon = e.icon;
                  return (
                    <CommandItem
                      key={`recent-${e.to}`}
                      value={`recent ${e.label} ${e.to}`}
                      onSelect={() => go(e.to)}
                    >
                      <Clock className="mr-2 h-4 w-4 opacity-60" />
                      <span>{e.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading={t("commandPalette.sectionActions")}>
            <CommandItem value="sync sincronizar" onSelect={() => run(syncNow)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>{t("commandPalette.actions.sync")}</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandItem value="theme light claro" onSelect={() => run(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              <span>{t("commandPalette.actions.themeLight")}</span>
            </CommandItem>
            <CommandItem value="theme dark escuro oscuro" onSelect={() => run(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              <span>{t("commandPalette.actions.themeDark")}</span>
            </CommandItem>
            {(["pt", "en", "es"] as SupportedLanguage[])
              .filter((l) => l !== i18n.language)
              .map((l) => (
                <CommandItem
                  key={`lang-${l}`}
                  value={`language idioma ${l}`}
                  onSelect={() => run(() => { void changeLanguage(l); })}
                >
                  <Languages className="mr-2 h-4 w-4" />
                  <span>
                    {t(
                      l === "pt"
                        ? "commandPalette.actions.langPt"
                        : l === "en"
                          ? "commandPalette.actions.langEn"
                          : "commandPalette.actions.langEs",
                    )}
                  </span>
                </CommandItem>
              ))}
            <CommandItem
              value="support coffee apoiar desenvolvedor"
              onSelect={() => run(() => setSupportOpen(true))}
            >
              <Coffee className="mr-2 h-4 w-4" />
              <span>{t("commandPalette.actions.support")}</span>
            </CommandItem>
            <CommandItem
              value="logout sair"
              onSelect={() => run(async () => {
                await signOut();
                navigate({ to: "/" });
              })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("commandPalette.actions.logout")}</span>
            </CommandItem>
          </CommandGroup>

          {groups.map((g) => {
            const items = entries.filter((e) => e.group === g.id);
            if (items.length === 0) return null;
            return (
              <div key={g.id}>
                <CommandSeparator />
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

      <SupportDeveloperDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}
