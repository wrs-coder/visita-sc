/**
 * Controle de tempo por tópico nos modos de leitura (esboço / tela cheia).
 * Selo discreto "até HH:MM" por tópico, toque para concluir e pílula de
 * atraso/adiantamento. Nada é gravado no esboço; concluídos ficam no aparelho.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOutlineTimer } from "@/hooks/use-outline-timer";
import {
  buildTopicSchedule,
  toggleTopicDone,
  useTopicsDone,
  type TimedTopic,
  type TopicSchedule,
} from "@/lib/outline-schedule";
import { cn } from "@/lib/utils";
import { useBadgePrefs } from "@/lib/topic-badge-prefs";

interface Ctx {
  outlineId: string;
  schedule: TopicSchedule;
}

const TopicTimingContext = createContext<Ctx | null>(null);

function fmtTime(ms: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
}

export function TopicTimingProvider({
  outlineId,
  topics,
  children,
}: {
  outlineId: string;
  topics: TimedTopic[];
  children: ReactNode;
}) {
  const timer = useOutlineTimer(outlineId);
  const done = useTopicsDone(outlineId);
  const started = timer.isRunning || timer.elapsedSec > 0;
  // Início real = agora - decorrido. Arredondado ao segundo para estabilidade.
  const startedAt = started ? Math.floor(Date.now() / 1000) * 1000 - timer.elapsedSec * 1000 : null;
  const startedKey = startedAt === null ? null : Math.round(startedAt / 5000);
  const schedule = useMemo(
    () => buildTopicSchedule(topics, startedAt, done),
    // startedKey evita recalcular a cada segundo por micro-variação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, startedKey, done],
  );
  const value = useMemo(() => ({ outlineId, schedule }), [outlineId, schedule]);
  if (topics.length === 0) return <>{children}</>;
  return <TopicTimingContext.Provider value={value}>{children}</TopicTimingContext.Provider>;
}

/** Selo do tópico: "+5" antes de iniciar; "até 19:42" depois; toque conclui. */
export function TopicTimeBadge({ topicId, floating = false }: { topicId: string; floating?: boolean }) {
  const { t } = useTranslation();
  const ctx = useContext(TopicTimingContext);
  const slot = ctx?.schedule.slots[topicId];
  const prefs = useBadgePrefs();
  if (!ctx || !slot) return null;
  const label = slot.expectedEnd !== null
    ? t("personalOutlines.topicTime.until", { time: fmtTime(slot.expectedEnd), defaultValue: "até {{time}}" })
    : `+${slot.cumulative} min`;
  const aria = slot.done
    ? t("personalOutlines.topicTime.undo", { defaultValue: "Desfazer tópico concluído" })
    : t("personalOutlines.topicTime.markDone", { defaultValue: "Marcar tópico como concluído" });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleTopicDone(ctx.outlineId, topicId);
      }}
      aria-pressed={slot.done}
      aria-label={`${label} · ${aria}`}
      title={aria}
      style={floating ? { opacity: (prefs.opacity / 100) * (slot.done ? 0.6 : 1) } : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border tabular-nums transition",
        floating
          ? cn(
              "border-transparent bg-background/60 backdrop-blur-sm shadow-sm",
              prefs.size === "lg" ? "px-2.5 py-0.5 text-sm" : prefs.size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0 text-[10px] leading-4",
            )
          : "px-2 py-0.5 text-[11px]",
        slot.done
          ? cn("text-muted-foreground line-through", !floating && "opacity-60")
          : slot.current
            ? cn("text-primary font-semibold", floating ? "bg-primary/10" : "border-primary bg-primary/10")
            : cn("text-muted-foreground", !floating && "border-border"),
        slot.done && !floating && "border-border",
      )}
    >
      {slot.done && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

/** True quando o tópico já foi concluído (para esmaecer o bloco). */
export function useTopicDone(topicId: string): boolean {
  const ctx = useContext(TopicTimingContext);
  return !!ctx?.schedule.slots[topicId]?.done;
}

/** Pílula "2 min atrasado / 1 min adiantado / no tempo". */
export function TopicDeviationPill() {
  const { t } = useTranslation();
  const ctx = useContext(TopicTimingContext);
  const dev = ctx?.schedule.deviationSec;
  if (dev === null || dev === undefined) return null;
  const min = Math.round(Math.abs(dev) / 60);
  const text = min === 0
    ? t("personalOutlines.topicTime.onTime", { defaultValue: "no tempo" })
    : dev > 0
      ? t("personalOutlines.topicTime.late", { count: min, defaultValue: "{{count}} min atrasado" })
      : t("personalOutlines.topicTime.early", { count: min, defaultValue: "{{count}} min adiantado" });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs tabular-nums",
        min === 0 ? "border-border text-muted-foreground" : dev > 0 ? "border-timer-over/50 text-timer-over" : "border-timer-ok/50 text-timer-ok",
      )}
      role="status"
    >
      {text}
    </span>
  );
}

/** True quando este tópico tem tempo definido. */
export function useTopicHasTime(topicId: string): boolean {
  const ctx = useContext(TopicTimingContext);
  return !!ctx?.schedule.slots[topicId];
}

/** True quando o esboço tem algum tópico com tempo. */
export function useHasTimedTopics(): boolean {
  const ctx = useContext(TopicTimingContext);
  return !!ctx && Object.keys(ctx.schedule.slots).length > 0;
}
