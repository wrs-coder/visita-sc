// Cabeçalho comum da aba do circuito: nome do circuito, pílulas Itinerário /
// Congregações e o ícone de calendário que abre o mês. As telas continuam
// em rotas próprias, para manter links antigos e rascunhos funcionando.
import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const CIRCUIT_PATHS = ["/configuracoes", "/congregacoes", "/cronograma"] as const;

export function circuitTitle(circuit: string | null | undefined, fallback: string): string {
  return circuit?.trim() || fallback;
}

export function CircuitHeader() {
  const { t } = useTranslation();
  const { profile, role } = useAuth();
  const { pathname } = useLocation();
  if (role !== "superintendent") return null;
  const pills = [
    { to: "/configuracoes" as const, label: t("sidebar.itinerary") },
    { to: "/congregacoes" as const, label: t("circuit.pillCircuit") },
  ];
  const onCalendar = pathname.startsWith("/cronograma");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold truncate">{circuitTitle(profile?.circuit, t("circuit.fallbackTitle"))}</h1>
        <Link
          to="/cronograma"
          search={{ view: "month" } as never}
          aria-label={t("circuit.openCalendar")}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-card transition active:scale-95",
            onCalendar ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <CalendarDays className="h-6 w-6" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {pills.map((p) => {
          const active = pathname.startsWith(p.to);
          return (
            <Link
              key={p.to}
              to={p.to}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-foreground border-transparent",
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
