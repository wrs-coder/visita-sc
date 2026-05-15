import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/escala")({ component: Page });

interface Row {
  id: string;
  visit_id: string;
  event_date: string;
  period: string;
  meeting_point: string | null;
  meeting_time: string | null;
  acompanhante: string | null;
  acompanhante_for: string | null;
  contact_phone: string | null;
  is_active: boolean;
}

function Page() {
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const isSuper = role === "superintendent";
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase
        .from("field_assignments")
        .select("id,visit_id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone,is_active")
        .eq("visit_id", visit.id)
        .order("event_date")
        .order("period");
      setRows((data ?? []) as Row[]);
    };
    load();
    const ch = supabase
      .channel(`fa-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_assignments", filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [visit]);

  const update = useCallback(async (id: string, patch: Partial<Row>) => {
    setSavingId(id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
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
        <h1 className="text-2xl md:text-3xl font-bold">Estudos e Revisitas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuper
            ? "Defina os turnos e edite acompanhante, local e telefone. Itens desativados ficam ocultos para a congregação."
            : "Edite acompanhante, local de encontro e telefone de contato."}
        </p>
      </div>

      <div className="space-y-5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayRows = rows.filter((r) => r.event_date === key);
          return (
            <section key={key}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{format(d, "EEEE, d MMM", { locale: ptBR })}</h2>
                {isSuper && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => add(key, "Manhã")}><Plus className="h-3 w-3 mr-1" />Manhã</Button>
                    <Button size="sm" variant="outline" onClick={() => add(key, "Tarde")}><Plus className="h-3 w-3 mr-1" />Tarde</Button>
                  </div>
                )}
              </div>
              {dayRows.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem turnos definidos.</CardContent></Card>
              ) : (
                dayRows.map((r) => (
                  <Card key={r.id} className={`shadow-card mb-2 transition ${!r.is_active ? "opacity-50" : ""}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
                          {r.period}
                          {!r.is_active && " · desativado"}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSuper && <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} aria-label="Ativar/desativar" />}
                          {savingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Check className="h-3.5 w-3.5 text-success" />}
                          {isSuper && (
                            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Local de encontro" v={r.meeting_point ?? ""} onSave={(v) => update(r.id, { meeting_point: v })} />
                        <Field label="Horário" type="time" v={r.meeting_time ?? ""} onSave={(v) => update(r.id, { meeting_time: v || null })} readOnly={!isSuper} />
                        <Field label="Acompanhante para estudos" v={r.acompanhante ?? ""} onSave={(v) => update(r.id, { acompanhante: v })} className="col-span-2" />
                        <div className="col-span-2">
                          <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Acompanhante para</label>
                          {isSuper ? (
                            <Select value={r.acompanhante_for ?? ""} onValueChange={(v) => update(r.id, { acompanhante_for: v || null })}>
                              <SelectTrigger className="h-9 mt-0.5"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="superintendente">Superintendente</SelectItem>
                                <SelectItem value="esposa">Esposa do superintendente</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input readOnly value={r.acompanhante_for === "esposa" ? "Esposa do superintendente" : r.acompanhante_for === "superintendente" ? "Superintendente" : "—"} className="h-9 mt-0.5" />
                          )}
                        </div>
                        <Field label="Telefone de contato" type="tel" v={r.contact_phone ?? ""} onSave={(v) => update(r.id, { contact_phone: v })} className="col-span-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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
