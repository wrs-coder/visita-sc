/**
 * Folha (estilo iOS/One UI) para enviar eventos do Programa da visita ao
 * Cronograma e/ou Notas Privadas sem sair da tela. Serve para um evento
 * (toque no botão do cartão) ou vários ("Salvar todos"), com ajuste por linha.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Lock, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { offlineInsert } from "@/lib/local-write";
import type { ElderVisitEventDTO } from "@/lib/elder-program.functions";
import {
  parseSlotLabel, pastoralEventToNote, makeUuid, pastoralEventToSchedule, recommendationToNote,
  type VisitRef,
} from "@/lib/pastoral-dispatch";

interface Row {
  ev: ElderVisitEventDTO;
  include: boolean;
  cron: boolean;
  notas: boolean;
  date: string;
  time: string;
}

export function ProgramDispatchSheet({
  open, onOpenChange, events, visit, userId, dispatched, onDispatched, batch,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  events: ElderVisitEventDTO[];
  visit: VisitRef;
  userId: string;
  dispatched: Set<string>;
  onDispatched: (keys: string[]) => void;
  batch: boolean;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(events.map((ev) => {
      const isPast = ev.section === "pastoral";
      const p = isPast ? parseSlotLabel(ev.slot_label, visit.start_date, visit.end_date) : {};
      const cronDone = dispatched.has(`cron:${ev.id}`);
      const notasDone = dispatched.has(`notas:${ev.id}`);
      const cron = isPast && !cronDone;
      const notas = !notasDone;
      return {
        ev, cron, notas,
        include: batch ? (cron || notas) : true,
        date: p.date ?? "", time: p.time ?? "",
      };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const active = rows.filter((r) => r.include && (r.cron || r.notas));
  const missingDate = active.some((r) => r.cron && !r.date);

  const save = async () => {
    if (missingDate) { toast.error("Escolha a data dos pastoreios que vão para o Cronograma."); return; }
    setSaving(true);
    const keys: string[] = [];
    let anyCron = false, anyNotas = false, offline = false, failed = 0;
    for (const r of active) {
      if (r.cron) {
        const res = await offlineInsert("circuit_schedule_events", {
          superintendent_id: userId,
          ...pastoralEventToSchedule(r.ev, visit, r.date, r.time || undefined),
        } as Record<string, unknown>);
        if (res.error) failed++; else { keys.push(`cron:${r.ev.id}`); anyCron = true; offline ||= !!res.queued; }
      }
      if (r.notas) {
        const fields = r.ev.section === "pastoral"
          ? pastoralEventToNote(r.ev, visit, r.date || undefined)
          : recommendationToNote(r.ev, visit);
        const res = await offlineInsert("private_notes", {
          id: makeUuid(), superintendent_id: userId, ...fields,
        } as Record<string, unknown>);
        if (res.error) failed++; else { keys.push(`notas:${r.ev.id}`); anyNotas = true; offline ||= !!res.queued; }
      }
    }
    setSaving(false);
    onDispatched(keys);
    onOpenChange(false);
    if (failed) toast.error(`${failed} item(ns) não puderam ser salvos.`);
    if (keys.length) {
      const msg = offline ? "Salvo no aparelho — envia quando houver internet" : "Salvo";
      toast.success(msg, {
        duration: 4000,
        action: anyCron
          ? { label: "Ver Cronograma", onClick: () => navigate({ to: "/cronograma", search: {} as never }) }
          : anyNotas
            ? { label: "Ver Notas", onClick: () => navigate({ to: "/notas", search: { tab: "pastoral" } as never }) }
            : undefined,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{batch ? `Salvar todos (${rows.length})` : "Salvar"}</SheetTitle>
          <SheetDescription>Você continua no Programa da visita.</SheetDescription>
        </SheetHeader>
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => {
            const isPast = r.ev.section === "pastoral";
            const name = (isPast ? r.ev.family_name : r.ev.full_name) || "Sem nome";
            const cronDone = dispatched.has(`cron:${r.ev.id}`);
            const notasDone = dispatched.has(`notas:${r.ev.id}`);
            return (
              <div key={r.ev.id} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {batch && (
                    <Checkbox checked={r.include} onCheckedChange={(v) => patch(i, { include: !!v })} aria-label={`Incluir ${name}`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {isPast ? (r.ev.slot_label || "Sem dia/horário") : "Recomendação"}
                      {(cronDone || notasDone) && " · já salvo"}
                    </p>
                  </div>
                </div>
                {r.include && (
                  <div className="space-y-2 pl-1">
                    {isPast && (
                      <label className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" /> Agendar no Cronograma{cronDone && " ✓"}</span>
                        <Switch checked={r.cron} onCheckedChange={(v) => patch(i, { cron: v })} />
                      </label>
                    )}
                    {isPast && r.cron && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-muted-foreground">Data</span>
                          <Input type="date" value={r.date} min={visit.start_date} max={visit.end_date}
                            onChange={(e) => patch(i, { date: e.target.value })} />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Horário início</span>
                          <Input type="time" value={r.time} onChange={(e) => patch(i, { time: e.target.value })} />
                        </div>
                      </div>
                    )}
                    <label className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Salvar em Notas Privadas{notasDone && " ✓"}</span>
                      <Switch checked={r.notas} onCheckedChange={(v) => patch(i, { notas: v })} />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="sticky bottom-0 mt-4 flex gap-2 bg-background pt-2 pb-[env(safe-area-inset-bottom)]">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" disabled={saving || active.length === 0} onClick={save}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {batch ? `Salvar ${active.length}` : "Confirmar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
