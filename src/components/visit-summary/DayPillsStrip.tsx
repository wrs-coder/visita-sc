import { useEffect, useRef } from "react";

export type DayPill = { iso: string; weekday: string; day: string };

/** Faixa de dias com o dia escolhido sempre centralizado; hoje tem borda colorida. */
export function DayPillsStrip({ pills, viewedIso, todayIso, todayLabel, ariaLabel, onPick }: {
  pills: DayPill[];
  viewedIso: string;
  todayIso: string;
  todayLabel: string;
  ariaLabel: string;
  onPick: (iso: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-iso="${viewedIso}"]`);
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: firstRun.current ? "auto" : "smooth" });
    firstRun.current = false;
  }, [viewedIso, pills.length]);
  return (
    <div ref={stripRef} className="relative flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label={ariaLabel} title={todayLabel}>
      {pills.map((d) => {
        const active = d.iso === viewedIso;
        const isToday = d.iso === todayIso;
        return (
          <button
            key={d.iso}
            data-iso={d.iso}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={isToday ? "date" : undefined}
            onClick={() => onPick(d.iso)}
            className={`relative shrink-0 min-w-[52px] rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : isToday
                  ? "bg-background text-primary border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            <div className="capitalize leading-tight">{d.weekday}</div>
            <div className="leading-tight opacity-80">{d.day}</div>
          </button>
        );
      })}
    </div>
  );
}
