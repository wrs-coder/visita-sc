/**
 * Tempo por tópico da pauta, preso ao cronômetro (sem boia flutuante).
 * Opcional: o superintendente liga/desliga e a escolha fica no aparelho.
 * O relógio é o mesmo da tela cheia da pauta (agenda-<visita>), então os dois andam juntos.
 */
import { useEffect, useState } from "react";
import { ChevronRight, ListOrdered, Pause, Play, RotateCcw } from "lucide-react";
import { useOutlineTimer } from "@/hooks/use-outline-timer";
import { topicAt, type NumberedBlock } from "@/lib/elder-agenda/agenda";
import { cn } from "@/lib/utils";

const PREF_KEY = "agendaTopicRow.on";
const EVT = "agenda-topic-row-pref";
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

export function useTopicRowPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => { try { setOn(localStorage.getItem(PREF_KEY) === "1"); } catch { /* */ } };
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  const set = (v: boolean) => { try { localStorage.setItem(PREF_KEY, v ? "1" : "0"); } catch { /* */ } setOn(v); window.dispatchEvent(new Event(EVT)); };
  return [on, set];
}

/** Botão redondo que liga/desliga a linha de tempo por tópico. */
export function AgendaTopicToggle({ className }: { className?: string }) {
  const [on, set] = useTopicRowPref();
  return (
    <button type="button" onClick={() => set(!on)} aria-pressed={on} aria-label="Tempo por tópico" title="Tempo por tópico"
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground", className)}>
      <ListOrdered className="h-4 w-4" />
    </button>
  );
}

export function AgendaTopicRow({ visitId, list, onGoTopic, className }: { visitId: string; list: NumberedBlock[]; onGoTopic?: (id: string) => void; className?: string }) {
  const t = useOutlineTimer(`agenda-${visitId}`);
  const [on] = useTopicRowPref();
  const total = list.reduce((s, x) => s + x.block.minutes, 0);
  if (!on || total <= 0) return null;
  const cur = topicAt(list, t.elapsedSec);
  const it = cur ? list[cur.index] : undefined;
  const next = cur ? list[cur.index + 1] : undefined;
  const toggle = () => {
    if (!t.isRunning && !t.targetChosen) t.startWith(total * 60, t.elapsedSec);
    else t.toggle();
  };
  return (
    <div className={cn("flex items-center gap-2 rounded-2xl bg-muted/60 px-2 py-1.5", className)}>
      <button type="button" onClick={toggle} aria-label={t.isRunning ? "Pausar" : "Iniciar"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {t.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => it && onGoTopic?.(it.block.id)}>
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{it ? `${it.n}. ${it.block.title}` : ""}</span>
          <span className={cn("ml-auto shrink-0 text-sm font-semibold tabular-nums", cur?.overSec ? "text-destructive" : cur && cur.remainingSec < 60 && t.isRunning ? "text-primary" : "")}>
            {cur?.overSec ? `+${mmss(cur.overSec)}` : `faltam ${mmss(cur?.remainingSec ?? 0)}`}
          </span>
        </span>
        {next ? <span className="block truncate text-[11px] text-muted-foreground">Próximo: {next.block.title}</span> : null}
      </button>
      {t.elapsedSec > 0 && !t.isRunning ? (
        <button type="button" onClick={t.reset} aria-label="Zerar" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-background"><RotateCcw className="h-4 w-4" /></button>
      ) : next && onGoTopic ? (
        <button type="button" onClick={() => onGoTopic(next.block.id)} aria-label="Ir para o próximo tópico" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-background"><ChevronRight className="h-4 w-4" /></button>
      ) : null}
    </div>
  );
}
