import { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardCardCollapsed } from "@/hooks/use-dashboard-card-collapsed";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";

// Onda 6.8 — accent opcional por card (override do --section-color da rota).
export type CardAccent =
  | "visit"
  | "meetings"
  | "couple"
  | "checklist"
  | "meals"
  | "elder"
  | "notes"
  | "admin";

const ACCENT_VAR: Record<CardAccent, string> = {
  visit: "var(--accent-visit)",
  meetings: "var(--accent-meetings)",
  couple: "var(--accent-couple)",
  checklist: "var(--accent-checklist)",
  meals: "var(--accent-meals)",
  elder: "var(--accent-elder)",
  notes: "var(--accent-notes)",
  admin: "var(--accent-admin)",
};

interface CollapsibleCardProps {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  headerRight?: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  contentClassName?: string;
  /** Cor de borda lateral; default herda --section-color da rota. */
  accent?: CardAccent;
  children: ReactNode;
}

export function CollapsibleCard({
  id,
  title,
  icon,
  headerRight,
  defaultCollapsed = false,
  className,
  contentClassName,
  accent,
  children,
}: CollapsibleCardProps) {
  const [collapsed, toggle] = useDashboardCardCollapsed(id, defaultCollapsed);
  const { t } = useTranslation();
  const contentId = `cc-${id}`;

  const accentStyle: CSSProperties | undefined = accent
    ? ({ ["--accent-color" as never]: ACCENT_VAR[accent] } as CSSProperties)
    : undefined;

  return (
    <Card
      style={accentStyle}
      className={cn(
        // Onda 6.3 — sombra refinada + lift discreto no hover (180ms).
        "border-border/60 transition-shadow duration-200 hover:[box-shadow:var(--shadow-hover)]",
        "[box-shadow:var(--shadow-soft)]",
        // Onda 6.8 — borda lateral colorida por contexto (cascade ou override).
        "section-accent",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            aria-label={t("dashboard.collapseExpand", { defaultValue: "Expandir/recolher cartão" })}
            className="flex items-start gap-2.5 flex-1 min-w-0 text-left hover:opacity-90 transition-opacity"
          >
            {icon && (
              <span
                aria-hidden="true"
                className={cn(
                  // Chip do ícone — usa o accent do card quando presente, senão primary.
                  "shrink-0 inline-flex items-center justify-center",
                  "h-8 w-8 rounded-[var(--radius-sm)]",
                  "[&>svg]:h-4 [&>svg]:w-4",
                )}
                style={{
                  background: "color-mix(in oklab, var(--accent-color, var(--section-color, var(--primary))) 14%, transparent)",
                  color: "var(--accent-color, var(--section-color, var(--primary)))",
                }}
              >
                {icon}
              </span>
            )}
            <h3 className="font-semibold leading-snug whitespace-normal break-words [overflow-wrap:anywhere] min-w-0 self-center">
              {title}
            </h3>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5 transition-transform" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5 transition-transform" />
            )}
          </button>
          {headerRight && !collapsed && (
            <div className="shrink-0">{headerRight}</div>
          )}
        </div>
        {!collapsed && (
          <div id={contentId} className={cn("mt-3", contentClassName)}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
