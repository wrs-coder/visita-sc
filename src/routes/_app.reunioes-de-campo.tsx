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
import { FIELD_MODALITY_LABELS, type FIELD_MODALITIES } from "@/lib/field-meeting-templates.functions";

export const Route = createFileRoute("/_app/reunioes-de-campo")({ component: Page });

type Modality = (typeof FIELD_MODALITIES)[number];

interface Row {
  id: string;
  visit_id: string;
  event_date: string;
  period: string;
  meeting_time: string | null;
  territory_number: string | null;
  territory_location: string | null;
  closing_prayer: string | null;
  is_active: boolean;
}

function Page() {
  const { visit } = useActiveVisit();
  const { role, congregation } = useAuth();
  const isSuper = role === "superintendent";
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modality, setModality] = useState<Modality | null>(null);

  useEffect(() => {
    if (!congregation) return;
    const loadModality = async () => {
      const { data } = await supabase
        .from("field_meeting_templates")
        .select("modality")
        .eq("congregation_id", congregation.id)
        .maybeSingle();
      setModality((data?.modality as Modality | undefined) ?? null);
    };
    loadModality();
    const ch = supabase
      .channel(`fmt-${congregation.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_meeting_templates", filter: `congregation_id=eq.${congregation.id}` }, loadModality)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [congregation]);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase
        .from("field_meetings")
        .select("id,visit_id,event_date,period,meeting_time,territory_number,territory_location,closing_prayer,is_active")
        .eq("visit_id", visit.id)
        .order("event_date")
        .order("period");
      setRows((data ?? []) as Row[]);
    };
    load();
    const ch = supabase
      .channel(`fm-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_meetings", filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  const update = useCallback(async (id: string, patch: Partial<Row>) => {
    setSavingId(id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("field_meetings").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
  }, []);

  const add = async (date: string, period: string) => {
    if (!visit) return;
    const { error } = await supabase.from("field_meetings").insert({ visit_id: visit.id, event_date: date, period });
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("field_meetings").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;

  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });
  // Modality controls which fields appear for the elders
  const showAllFields = modality === null || modality === "casa_em_casa" || isSuper;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reuniões de Campo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuper
            ? "Defina os turnos. O superintendente pode definir a modalidade na aba Modelo Reuniões de Campo."
            : modality
              ? `Modalidade definida: ${FIELD_MODALITY_LABELS[modality]}.`
              : "Preencha os dados das reuniões de campo."}
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
                  <RowCard key={r.id} row={r} isSuper={isSuper} showAllFields={showAllFields} saving={savingId === r.id} update={update} remove={remove} />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RowCard({ row: r, isSuper, showAllFields, saving, update, remove }: { row: Row; isSuper: boolean; showAllFields: boolean; saving: boolean; update: (id: string, p: Partial<Row>) => Promise<void>; remove: (id: string) => void }) {
  const [meeting_time, setMeetingTime] = useState(r.meeting_time ?? "");
  const [territory_number, setTerritoryNumber] = useState(r.territory_number ?? "");
  const [territory_location, setTerritoryLocation] = useState(r.territory_location ?? "");
  const [closing_prayer, setClosingPrayer] = useState(r.closing_prayer ?? "");

  useEffect(() => {
    setMeetingTime(r.meeting_time ?? "");
    setTerritoryNumber(r.territory_number ?? "");
    setTerritoryLocation(r.territory_location ?? "");
    setClosingPrayer(r.closing_prayer ?? "");
  }, [r.id, r.meeting_time, r.territory_number, r.territory_location, r.closing_prayer]);

  const dirty =
    meeting_time !== (r.meeting_time ?? "") ||
    territory_number !== (r.territory_number ?? "") ||
    territory_location !== (r.territory_location ?? "") ||
    closing_prayer !== (r.closing_prayer ?? "");

  const everSaved = !!(r.meeting_time || r.territory_number || r.territory_location || r.closing_prayer);

  const handleSave = () => {
    if (!dirty) return;
    update(r.id, {
      meeting_time: meeting_time || null,
      territory_number: territory_number || null,
      territory_location: territory_location || null,
      closing_prayer: closing_prayer || null,
    });
  };

  return (
    <Card className={`shadow-card mb-2 transition ${!r.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
            {r.period}
            {!r.is_active && " · desativado"}
          </div>
          <div className="flex items-center gap-2">
            {isSuper && <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} aria-label="Ativar/desativar" />}
            {isSuper && (
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {showAllFields && (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Horário</label>
                <Input type="time" value={meeting_time} readOnly={!isSuper} onChange={(e) => setMeetingTime(e.target.value)} className="h-9 mt-0.5" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">N° do território S-13</label>
                <Input value={territory_number} onChange={(e) => setTerritoryNumber(e.target.value)} className="h-9 mt-0.5" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Localização do território</label>
                <Input value={territory_location} onChange={(e) => setTerritoryLocation(e.target.value)} className="h-9 mt-0.5" />
              </div>
            </>
          )}
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Oração final</label>
            <Input value={closing_prayer} onChange={(e) => setClosingPrayer(e.target.value)} className="h-9 mt-0.5" />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
