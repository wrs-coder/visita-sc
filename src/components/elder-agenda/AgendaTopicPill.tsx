/**
 * Pílula flutuante de tempo por tópico da pauta (mesma boia do Modo esboço):
 * arrasta e prende na borda, mostra o tópico atual, o tempo que falta nele e o próximo.
 * O relógio é o mesmo da tela cheia da pauta (agenda-<visita>), então os dois andam juntos.
 */
import { useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { FloatingDock } from "@/components/notes/FloatingDock";
import { useOutlineTimer } from "@/hooks/use-outline-timer";
import { topicAt, type NumberedBlock } from "@/lib/elder-agenda/agenda";
import { cn } from "@/lib/utils";

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

export function AgendaTopicPill({ visitId, list, onGoTopic }: { visitId: string; list: NumberedBlock[]; onGoTopic?: (id: string) => void }) {
  const t = useOutlineTimer(`agenda-${visitId}`);
  const [closed, setClosed] = useState(false);
  const total = list.reduce((s, x) => s + x.block.minutes, 0);
  if (closed || total <= 0) return null;
  const cur = topicAt(list, t.elapsedSec);
  const it = cur ? list[cur.index] : undefined;
  const next = cur ? list[cur.index + 1] : undefined;
  const toggle = () => {
    if (!t.isRunning && !t.targetChosen) t.startWith(total * 60, t.elapsedSec);
    else t.toggle();
  };
  return (
    <FloatingDock storageKey="agendaTopicPill.floatPos" defaultPos={{ side: "right", y: 9999 }}
      gripLabel="Mover tempo do tópico" onClose={() => setClosed(true)} closeLabel="Fechar tempo do tópico">
      <div className="flex items-center gap-2 px-1 py-0.5">
        <button type="button" onClick={toggle} aria-label={t.isRunning ? "Pausar" : "Iniciar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {t.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" className="min-w-0 text-left" onClick={() => it && onGoTopic?.(it.block.id)}>
          <span className={cn("block text-sm font-semibold tabular-nums", cur?.overSec ? "text-destructive" : cur && cur.remainingSec < 60 && t.isRunning ? "text-primary" : "")}>
            {it ? `${it.n} · ` : ""}{cur?.overSec ? `+${mmss(cur.overSec)}` : mmss(cur?.remainingSec ?? 0)}
          </span>
          <span className="block max-w-[9rem] truncate text-[11px] text-muted-foreground">{next ? `Próximo: ${next.block.title}` : it?.block.title ?? ""}</span>
        </button>
        {t.elapsedSec > 0 && !t.isRunning ? (
          <button type="button" onClick={t.reset} aria-label="Zerar" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><RotateCcw className="h-4 w-4" /></button>
        ) : null}
      </div>
    </FloatingDock>
  );
}
