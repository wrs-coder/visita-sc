import { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardCardCollapsed } from "@/hooks/use-dashboard-card-collapsed";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CollapsibleCardProps {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  headerRight?: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  contentClassName?: string;
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
  children,
}: CollapsibleCardProps) {
  const [collapsed, toggle] = useDashboardCardCollapsed(id, defaultCollapsed);
  const { t } = useTranslation();
  const contentId = `cc-${id}`;

  return (
    <Card
      className={cn(
        // Onda 6.3 — sombra refinada + lift discreto no hover (180ms).
        "border-border/60 transition-shadow duration-200 hover:[box-shadow:var(--shadow-hover)]",
        "[box-shadow:var(--shadow-soft)]",
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
                  // Chip colorido para o ícone — visual premium uniforme.
                  "shrink-0 inline-flex items-center justify-center",
                  "h-8 w-8 rounded-[var(--radius-sm)]",
                  "bg-primary/10 text-primary",
                  "[&>svg]:h-4 [&>svg]:w-4",
                )}
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
