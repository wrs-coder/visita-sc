// Calendário mensal no estilo Google Agenda: pontos nos dias com eventos e
// faixa colorida nos dias de visita. Só apresentação; os dados vêm da tela.
import { useMemo } from "react";
import { addMonths, format, isSameDay } from "date-fns";
import type { Locale } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { buildMonthGrid } from "@/lib/month-grid";
import { cn } from "@/lib/utils";

export interface MonthVisit { id: string; title: string; start_date: string; end_date: string }

export function MonthCalendar({
  month, onMonthChange, selected, onSelect, events, visits, locale,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: string;
  onSelect: (key: string) => void;
  events: { event_date: string }[];
  visits: MonthVisit[];
  locale: Locale;
}) {
  const { t } = useTranslation();
  const weeks = useMemo(() => buildMonthGrid(month, events, visits), [month, events, visits]);
  const weekdays = weeks[0]?.map((c) => format(c.date, "EEEEE", { locale })) ?? [];
  const today = new Date();

  return (
    <section className="rounded-2xl border bg-card p-3 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Button variant="ghost" size="icon" aria-label={t("circuit.prevMonth")} onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold capitalize">{format(month, "MMMM yyyy", { locale })}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => { onMonthChange(new Date()); onSelect(format(new Date(), "yyyy-MM-dd")); }}>
            {t("circuit.today")}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("circuit.nextMonth")} onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground mb-1">
        {weekdays.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="space-y-1">
        {weeks.map((week) => (
          <div key={week[0].key} className="grid grid-cols-7">
            {week.map((c, i) => {
              const inVisit = c.visitIds.length > 0;
              const prevIn = i > 0 && week[i - 1].visitIds.length > 0;
              const nextIn = i < 6 && week[i + 1].visitIds.length > 0;
              const isSel = c.key === selected;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelect(c.key)}
                  className="relative flex flex-col items-center py-1 min-h-11"
                  aria-label={format(c.date, "PPPP", { locale })}
                  aria-pressed={isSel}
                >
                  {inVisit && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 top-1 h-7 bg-primary/15",
                        !prevIn && "left-1 rounded-l-full",
                        !nextIn && "right-1 rounded-r-full",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      !c.inMonth && "text-muted-foreground/50",
                      isSameDay(c.date, today) && !isSel && "text-primary font-bold",
                      isSel && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {format(c.date, "d")}
                  </span>
                  <span className="relative z-10 mt-0.5 flex h-1.5 gap-0.5">
                    {Array.from({ length: Math.min(c.eventCount, 3) }).map((_, k) => (
                      <span key={k} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {visits.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-block h-2.5 w-5 rounded-full bg-primary/15" /> {t("circuit.visitLegend")}
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary ml-2" /> {t("circuit.eventLegend")}
        </p>
      )}
    </section>
  );
}
