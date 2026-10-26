import { Link, useLocation } from "@tanstack/react-router";
import { FileStack, ListChecks, MapPin, Layers, BookOpen, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export const TEMPLATE_TABS = [
  { to: "/modelos", label: "Programação", icon: FileStack },
  { to: "/checklist-modelos", label: "Checklist", icon: ListChecks },
  { to: "/modelo-reunioes-de-campo", label: "Campo", icon: MapPin },
  { to: "/modelo-reunioes-discursos", label: "Discursos", icon: Layers },
  { to: "/modelo-programacao-ancioes", label: "Anciãos", icon: BookOpen },
  { to: "/pacotes-visita", label: "Pacotes", icon: Package },
] as const;

/** Pílulas da aba única "Modelos": troca entre os tipos de modelo. */
export function TemplatesTabs() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Tipos de modelo" className="flex flex-wrap gap-1.5">
      {TEMPLATE_TABS.map(({ to, label, icon: Icon }) => {
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
