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
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";
import { FIELD_MODALITIES, FIELD_MODALITY_LABELS } from "@/lib/field-meeting-templates.functions";

export const Route = createFileRoute("/_app/reunioes-de-campo")({ component: Page });

type Modality = (typeof FIELD_MODALITIES)[number];

interface Row {
  id: string;
  visit_id: string;
  event_date: string;
  period: string;
  modality: Modality;
  meeting_time: string | null;
  territory_number: string | null;
  territory_location: string | null;
  auxiliary_leaders: string | null;
  closing_prayer: string | null;
  is_active: boolean;
}

function Page() {
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const isSuper = role === "superintendent";
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editEnabled, setEditEnabled] = useState(false);
  const editAllowed = !isSuper || editEnabled;

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase
        .from("field_meetings")
        .select("id,visit_id,event_date,period,modality,meeting_time,territory_number,territory_location,auxiliary_leaders,closing_prayer,is_active")
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reuniões de Campo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuper
            ? "Defina os turnos e a modalidade de cada um. Os campos exibidos aos anciãos seguem a modalidade do turno."
            : "Preencha os dados das reuniões de campo. Cada turno mostra apenas os campos da sua modalidade."}
        </p>
      </div>

      {isSuper && <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />}

      <fieldset disabled={!editAllowed} className="space-y-5 disabled:opacity-70 min-w-0 border-0 p-0 m-0">
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
                  <RowCard key={r.id} row={r} isSuper={isSuper} saving={savingId === r.id} update={update} remove={remove} />
                ))
              )}
            </section>
          );
        })}
      </fieldset>
    </div>
  );
}

function RowCard({ row: r, isSuper, saving, update, remove }: { row: Row; isSuper: boolean; saving: boolean; update: (id: string, p: Partial<Row>) => Promise<void>; remove: (id: string) => void }) {
  const [meeting_time, setMeetingTime] = useState(r.meeting_time ?? "");
  const [territory_number, setTerritoryNumber] = useState(r.territory_number ?? "");
  const [territory_location, setTerritoryLocation] = useState(r.territory_location ?? "");
  const [auxiliary_leaders, setAuxiliaryLeaders] = useState(r.auxiliary_leaders ?? "");
  const [closing_prayer, setClosingPrayer] = useState(r.closing_prayer ?? "");

  useEffect(() => {
    setMeetingTime(r.meeting_time ?? "");
    setTerritoryNumber(r.territory_number ?? "");
    setTerritoryLocation(r.territory_location ?? "");
    setAuxiliaryLeaders(r.auxiliary_leaders ?? "");
    setClosingPrayer(r.closing_prayer ?? "");
  }, [r.id, r.meeting_time, r.territory_number, r.territory_location, r.auxiliary_leaders, r.closing_prayer]);

  const dirty =
    meeting_time !== (r.meeting_time ?? "") ||
    territory_number !== (r.territory_number ?? "") ||
    territory_location !== (r.territory_location ?? "") ||
    auxiliary_leaders !== (r.auxiliary_leaders ?? "") ||
    closing_prayer !== (r.closing_prayer ?? "");

  const everSaved = !!(r.meeting_time || r.territory_number || r.territory_location || r.auxiliary_leaders || r.closing_prayer);
  const showTerritory = r.modality === "casa_em_casa";

  const handleSave = () => {
    if (!dirty) return;
    update(r.id, {
      meeting_time: meeting_time || null,
      territory_number: territory_number || null,
      territory_location: territory_location || null,
      auxiliary_leaders: auxiliary_leaders || null,
      closing_prayer: closing_prayer || null,
    });
  };

  return (
    <Card className={`shadow-card mb-2 transition ${!r.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
              {r.period}
              {!r.is_active && " · desativado"}
            </div>
            <div className="text-xs text-muted-foreground truncate">{FIELD_MODALITY_LABELS[r.modality]}</div>
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
        {isSuper && (
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Modalidade</label>
            <Select value={r.modality} onValueChange={(v) => update(r.id, { modality: v as Modality })}>
              <SelectTrigger className="h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{FIELD_MODALITY_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Horário</label>
            <Input type="time" value={meeting_time} readOnly={!isSuper} onChange={(e) => setMeetingTime(e.target.value)} className="h-9 mt-0.5" />
          </div>
          {showTerritory && (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">N° do território S-13</label>
                <Input value={territory_number} onChange={(e) => setTerritoryNumber(e.target.value)} className="h-9 mt-0.5" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Localização do território</label>
                <Input value={territory_location} onChange={(e) => setTerritoryLocation(e.target.value)} className="h-9 mt-0.5" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Dirigentes auxiliares</label>
                <Input value={auxiliary_leaders} onChange={(e) => setAuxiliaryLeaders(e.target.value)} className="h-9 mt-0.5" />
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
