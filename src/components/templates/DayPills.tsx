import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MONDAY_OFFSET, clampActiveDay, readPref, visibleTemplateDays, writePref } from "@/lib/template-day-pills";

/** Estado do dia ativo + chave "Segunda", lembrado no aparelho por tela/modelo. */
export function useTemplateDays(prefKey: string, hasMondayItems: boolean) {
  const [showMonday, setShowMondayState] = useState(false);
  const [day, setDayState] = useState(0);
  useEffect(() => {
    setShowMondayState(readPref(`${prefKey}:monday`, false));
    setDayState(readPref(`${prefKey}:day`, 0));
  }, [prefKey]);
  const days = visibleTemplateDays(showMonday, hasMondayItems);
  const activeDay = clampActiveDay(day, days);
  return {
    days,
    activeDay,
    showMonday: showMonday || hasMondayItems,
    mondayLocked: hasMondayItems,
    setShowMonday: (v: boolean) => { setShowMondayState(v); writePref(`${prefKey}:monday`, v); },
    setActiveDay: (d: number) => { setDayState(d); writePref(`${prefKey}:day`, d); },
  };
}

export function DayPills({ days, activeDay, onPick, dayLabel, hasItems, showMonday, mondayLocked, onToggleMonday }: {
  days: number[];
  activeDay: number;
  onPick: (d: number) => void;
  dayLabel: Record<number, string>;
  hasItems: (d: number) => boolean;
  showMonday: boolean;
  mondayLocked: boolean;
  onToggleMonday: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("templates.dayPills.title")}</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("templates.dayPills.monday")}
          <Switch checked={showMonday} disabled={mondayLocked} onCheckedChange={onToggleMonday} aria-label={t("templates.dayPills.monday")} />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("templates.dayPills.title")}>
        {days.map((d) => {
          const active = d === activeDay;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPick(d)}
              className={cn(
                "relative min-w-[52px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted",
                d === MONDAY_OFFSET && !active && "border-dashed",
              )}
            >
              {dayLabel[d]}
              {hasItems(d) && (
                <span className={cn("absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full", active ? "bg-primary-foreground" : "bg-primary")} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SectionPills<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
