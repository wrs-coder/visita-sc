import { Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Users, MapPin, UtensilsCrossed, Car, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { writePref } from "@/lib/template-day-pills";

export const VISIT_PROGRAM_TABS = [
  { to: "/programa-ancioes", key: "elders", label: "Anciãos", icon: BookOpen },
  { to: "/escala", key: "studies", label: "Estudos e Revisitas", icon: Users },
  { to: "/reunioes-discursos", key: "meetings", label: "Reuniões", icon: MapPin },
  { to: "/refeicoes", key: "meals", label: "Refeições", icon: UtensilsCrossed },
  { to: "/transporte", key: "transport", label: "Transporte", icon: Car },
  { to: "/checklist", key: "checklist", label: "Checklist", icon: ListChecks },
] as const;

export const VISIT_PROGRAM_PREF = "visita-sc:visit-program-tab";
export const VISIT_PROGRAM_PATHS: string[] = VISIT_PROGRAM_TABS.map((t) => t.to);

/** Pílulas da aba única "Programa da visita". */
export function VisitProgramTabs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useEffect(() => {
    if (VISIT_PROGRAM_PATHS.includes(pathname)) writePref(VISIT_PROGRAM_PREF, pathname);
  }, [pathname]);
  return (
    <nav aria-label={t("visitProgram.title", { defaultValue: "Programa da visita" })} className="flex flex-wrap gap-1.5 mb-4">
      {VISIT_PROGRAM_TABS.map(({ to, key, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(`visitProgram.tabs.${key}`, { defaultValue: label })}
          </Link>
        );
      })}
    </nav>
  );
}
