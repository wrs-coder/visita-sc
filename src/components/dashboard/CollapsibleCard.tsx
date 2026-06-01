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
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            aria-label={t("dashboard.collapseExpand", { defaultValue: "Expandir/recolher cartão" })}
            className="flex items-start gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            {icon}
            <h3 className="font-semibold leading-snug whitespace-normal break-words [overflow-wrap:anywhere] min-w-0">{title}</h3>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
