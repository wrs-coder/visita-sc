import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/escala")({ component: Page });

interface Row { id: string; visit_id: string; event_date: string; period: string; meeting_point: string | null; meeting_time: string | null; dirigente: string | null; piloto: string | null; acompanhante: string | null; is_active: boolean; }

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase.from("field_assignments").select("*").eq("visit_id", visit.id).order("event_date").order("period");
      setRows((data ?? []) as Row[]);
    };
    load();
    const ch = supabase.channel(`fa-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_assignments", filter: `visit_id=eq.${visit.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  const update = useCallback(async (id: string, patch: Partial<Row>) => {
    setSavingId(id);
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error } = await supabase.from("field_assignments").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
  }, []);

  const add = async (date: string, period: string) => {
    if (!visit) return;
    const { error } = await supabase.from("field_assignments").insert({ visit_id: visit.id, event_date: date, period });
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("field_assignments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;

  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Escala de Serviço de Campo</h1>
        <p className="text-sm text-muted-foreground mt-1">{canEdit ? "Edite dirigente, piloto e acompanhante." : "Somente leitura — sua designação não permite editar."}</p>
      </div>

      <div className="space-y-5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayRows = rows.filter((r) => r.event_date === key);
          return (
            <section key={key}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{format(d, "EEEE, d MMM", { locale: ptBR })}</h2>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => add(key, "Manhã")}><Plus className="h-3 w-3 mr-1" />Manhã</Button>
                    <Button size="sm" variant="outline" onClick={() => add(key, "Tarde")}><Plus className="h-3 w-3 mr-1" />Tarde</Button>
                  </div>
                )}
              </div>
              {dayRows.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem escalas.</CardContent></Card>
              ) : dayRows.map((r) => (
                <Card key={r.id} className="shadow-card mb-2">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10">{r.period}</div>
                      <div className="flex items-center gap-2">
                        {canEdit && savingId === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        {canEdit && savingId !== r.id && <Check className="h-3.5 w-3.5 text-success" />}
                        {role === "superintendent" && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Local" v={r.meeting_point ?? ""} onSave={(v) => update(r.id, { meeting_point: v })} readOnly={!canEdit} />
                      <Field label="Horário" type="time" v={r.meeting_time ?? ""} onSave={(v) => update(r.id, { meeting_time: v || null })} readOnly={!canEdit} />
                      <Field label="Dirigente" v={r.dirigente ?? ""} onSave={(v) => update(r.id, { dirigente: v })} readOnly={!canEdit} />
                      <Field label="Piloto" v={r.piloto ?? ""} onSave={(v) => update(r.id, { piloto: v })} readOnly={!canEdit} />
                      <Field label="Acompanhante" v={r.acompanhante ?? ""} onSave={(v) => update(r.id, { acompanhante: v })} className="col-span-2" readOnly={!canEdit} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, v, onSave, type = "text", className = "", readOnly = false }: { label: string; v: string; onSave: (val: string) => void; type?: string; className?: string; readOnly?: boolean }) {
  const [val, setVal] = useState(v);
  useEffect(() => setVal(v), [v]);
  return (
    <div className={className}>
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</label>
      <Input type={type} value={val} readOnly={readOnly} onChange={(e) => setVal(e.target.value)} onBlur={() => { if (!readOnly && val !== v) onSave(val); }} className="h-9 mt-0.5" />
    </div>
  );
}
