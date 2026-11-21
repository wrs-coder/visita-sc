/**
 * Tempo por tópico da pauta, preso ao cartão do cronômetro (sem boia flutuante).
 * Opcional: o superintendente liga/desliga e a escolha fica no aparelho.
 * Tem relógio próprio (topic-clock.ts): play/pausa aqui não mexe no cronômetro geral.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ListOrdered, Pause, Play, RotateCcw } from "lucide-react";
import { useAgendaTopicClock } from "@/lib/elder-agenda/topic-clock";
import type { NumberedBlock } from "@/lib/elder-agenda/agenda";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const PREF_KEY = "agendaTopicRow.on";
const LIST_KEY = "agendaTopicRow.listOpen";
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

/** Chave dentro das configurações do cronômetro que liga/desliga o tempo por tópico. */
export function AgendaTopicSetting() {
  const [on, set] = useTopicRowPref();
  return (
    <label className="flex items-center justify-between gap-2 px-1 py-1 text-sm cursor-pointer">
      <span className="flex items-center gap-2 min-w-0"><ListOrdered className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">Tempo por tópico</span></span>
      <Switch checked={on} onCheckedChange={set} aria-label="Tempo por tópico" />
    </label>
  );
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

const iconBtn = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background disabled:opacity-30";

export function AgendaTopicRow({ visitId, list, onGoTopic, className }: { visitId: string; list: NumberedBlock[]; onGoTopic?: (id: string) => void; className?: string }) {
  const [on] = useTopicRowPref();
  const ids = useMemo(() => list.map((x) => x.block.id), [list]);
  const c = useAgendaTopicClock(visitId, ids);
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(LIST_KEY) === "1"); } catch { /* */ } }, []);
  const setListOpen = (v: boolean) => { setOpen(v); try { localStorage.setItem(LIST_KEY, v ? "1" : "0"); } catch { /* */ } };
  if (!on || !list.length) return null;
  const it = list[c.index];
  const nextIt = list[c.index + 1];
  const used = c.used(c.index);
  const plan = (it?.block.minutes ?? 0) * 60;
  const over = plan > 0 && used > plan ? used - plan : 0;
  const go = (i: number) => { c.select(i); const b = list[i]; if (b) onGoTopic?.(b.block.id); };
  return (
    <div className={cn("rounded-2xl bg-muted/60 px-2 py-1.5", className)}>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => go(c.index - 1)} disabled={c.index === 0} aria-label="Tópico anterior" className={iconBtn}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={c.toggle} aria-label={c.running ? "Pausar tempo do tópico" : "Iniciar tempo do tópico"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {c.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" className="min-w-0 flex-1 px-1 text-left" onClick={() => it && onGoTopic?.(it.block.id)}>
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{it ? `${it.n}. ${it.block.title}` : ""}</span>
            <span className={cn("ml-auto shrink-0 text-sm font-semibold tabular-nums", over ? "text-destructive" : plan && plan - used < 60 && c.running ? "text-primary" : "")}>
              {plan ? (over ? `+${mmss(over)}` : `faltam ${mmss(plan - used)}`) : mmss(used)}
            </span>
          </span>
          {nextIt ? <span className="block truncate text-[11px] text-muted-foreground">Próximo: {nextIt.block.title}</span> : null}
        </button>
        <button type="button" onClick={c.resetCurrent} disabled={used <= 0} aria-label="Zerar tópico" className={iconBtn}><RotateCcw className="h-4 w-4" /></button>
        <button type="button" onClick={() => go(c.index + 1)} disabled={!nextIt} aria-label="Próximo tópico" className={iconBtn}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <button type="button" onClick={() => setListOpen(!open)} aria-expanded={open}
        className="mt-1 flex w-full items-center gap-1 rounded-lg px-1 py-1 text-xs font-medium text-muted-foreground">
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "" : "-rotate-90")} />
        Tempos dos tópicos ({list.length})
      </button>
      {open ? (
        <ul className="mt-0.5 divide-y divide-border/50">
          {list.map((x, i) => {
            const u = c.used(i); const p = x.block.minutes * 60; const cur = i === c.index;
            return (
              <li key={x.block.id}>
                <button type="button" onClick={() => go(i)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs", cur && "bg-background font-semibold")}>
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cur ? "bg-primary" : "bg-transparent")} />
                  <span className="min-w-0 flex-1 truncate">{x.n}. {x.block.title}</span>
                  <span className={cn("shrink-0 tabular-nums", p && u > p ? "text-destructive" : "text-muted-foreground")}>
                    {u > 0 ? mmss(u) : "--"}{p ? ` / ${mmss(p)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
          {c.clock && Object.keys(c.clock.usedSec).length ? (
            <li><button type="button" onClick={c.resetAll} className="w-full px-2 py-1.5 text-left text-xs text-destructive">Zerar todos os tópicos</button></li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
