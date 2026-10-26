import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useDateLocale } from "@/lib/date-locale";
import { pickInitialVisitDay } from "@/lib/visit-day-pills";

/** Dia escolhido nas pílulas da semana da visita (abre em hoje, senão no 1º dia). */
export function useVisitDay(keys: string[]) {
  const [active, setActive] = useState<string>(() => pickInitialVisitDay(keys, null));
  useEffect(() => {
    setActive((cur) => (keys.includes(cur) ? cur : pickInitialVisitDay(keys, format(new Date(), "yyyy-MM-dd"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(",")]);
  useEffect(() => {
    setActive(pickInitialVisitDay(keys, format(new Date(), "yyyy-MM-dd")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [active, setActive] as const;
}

export function VisitDayPills({ days, active, onPick, hasItems }: {
  days: Date[];
  active: string;
  onPick: (key: string) => void;
  hasItems: (key: string) => boolean;
}) {
  const locale = useDateLocale();
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onPick(key)}
            className={`relative min-w-[52px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            <div className="capitalize leading-tight">{format(d, "EEE", { locale })}</div>
            <div className="leading-tight opacity-80">{format(d, "d")}</div>
            {hasItems(key) && (
              <span className={`absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full ${on ? "bg-primary-foreground" : "bg-primary"}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
