import { useEffect, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getVisitWeekendThemes } from "@/lib/meeting-talk-templates.functions";
import { useSingleRow } from "./SingleRowPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}

function NoVisit() {
  return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;
}

// Pequeno editor de campo: digita e salva no blur quando muda.
function FieldText({
  value, onSave, readOnly, placeholder, type = "text",
}: {
  value: string | null;
  onSave: (v: string | null) => void | Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <Input
      type={type}
      value={local}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value ?? "")) onSave(local || null); }}
      className="h-9 mt-0.5"
    />
  );
}

/* ============ MEIO DE SEMANA ============ */
interface MidweekRow { id: string; visit_id: string; service_talk_theme: string | null; chairman: string | null; closing_prayer: string | null }

export function MidweekPanel() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const { row, loading, save } = useSingleRow<MidweekRow>(
    "midweek_meetings",
    "id,visit_id,service_talk_theme,chairman,closing_prayer",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>;
  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <div>
          <Label>Tema: Discurso de serviço</Label>
          <FieldText value={row.service_talk_theme} onSave={(v) => save({ service_talk_theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>Presidente da Reunião</Label>
          <FieldText value={row.chairman} onSave={(v) => save({ chairman: v })} placeholder="Nome do presidente" />
        </div>
        <div>
          <Label>Oração Final</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} placeholder="Nome de quem fará a oração" />
        </div>
      </fieldset>
      {!canEdit && <p className="text-xs text-muted-foreground">Somente anciãos com permissão podem editar.</p>}
    </CardContent></Card>
  );
}

/* ============ FINAL DE SEMANA ============ */
interface WeekendRow {
  id: string; visit_id: string;
  meeting_at: string | null;
  talk_theme_id: string | null;
  talk_theme_title: string | null;
  public_talk_theme: string | null;
}
interface Theme { id: string; title: string }

function tsToLocalInput(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function WeekendPanel() {
  const { visit } = useActiveVisit();
  const { canEdit, role } = useAuth();
  const isSuper = role === "superintendent";
  const { row, loading, save } = useSingleRow<WeekendRow>(
    "weekend_meetings",
    "id,visit_id,meeting_at,talk_theme_id,talk_theme_title,public_talk_theme",
    visit,
  );
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getVisitWeekendThemes({ data: { visitId: visit?.id ?? null } });
        if (cancelled) return;
        if (res.ok) setThemes(res.themes as Theme[]);
      } catch {
        if (!cancelled) setThemes([]);
      }
    };
    load();
    // recarrega quando temas do modelo mudarem
    const ch = supabase.channel(`weekend-themes-${visit?.id ?? "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_talk_template_weekend_themes" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [visit?.id]);

  if (!visit) return <NoVisit />;
  if (loading || !row) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>;

  const onPickTheme = async (id: string) => {
    const t = themes.find((x) => x.id === id);
    await save({ talk_theme_id: id, talk_theme_title: t?.title ?? null });
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 grid gap-3 max-w-xl">
        <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
          <div>
            <Label>Dia e Horário da Reunião</Label>
            <FieldText
              type="datetime-local"
              value={tsToLocalInput(row.meeting_at)}
              onSave={(v) => save({ meeting_at: v ? localInputToIso(v) : null })}
            />
          </div>
          <div>
            <Label>Discurso Público</Label>
            <FieldText
              value={row.public_talk_theme ?? ""}
              readOnly={!isSuper}
              onSave={(v) => save({ public_talk_theme: v || null })}
            />
            {!isSuper && (
              <p className="text-xs text-muted-foreground mt-1">Apenas leitura — editado pelo superintendente.</p>
            )}
          </div>
          <div>
            <Label>Discurso Final</Label>
            {themes.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                {isSuper
                  ? "Nenhum tema cadastrado. Adicione em Modelos de Reunião e Discurso → Fim de Semana."
                  : "Nenhum tema cadastrado — peça ao Superintendente."}
              </p>
            ) : (
              <Select value={row.talk_theme_id ?? ""} onValueChange={onPickTheme}>
                <SelectTrigger className="h-9 mt-0.5"><SelectValue placeholder="Selecione um tema" /></SelectTrigger>
                <SelectContent>
                  {themes.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {row.talk_theme_title && themes.length > 0 && !themes.find((t) => t.id === row.talk_theme_id) && (
              <p className="text-xs text-muted-foreground mt-1">Selecionado: {row.talk_theme_title}</p>
            )}
          </div>
        </fieldset>
      </CardContent></Card>
    </div>
  );
}

/* Gerenciador de Temas removido — temas do Discurso Final agora vivem em
   Modelos de Reunião e Discurso → Fim de Semana. */

/* ============ PIONEIROS ============ */
interface PioneerRow {
  id: string; visit_id: string;
  theme: string | null;
  opening_prayer: string | null;
  closing_prayer: string | null;
  location: string | null;
  meeting_at: string | null;
  super_meeting_at: string | null;
}

export function PioneerPanel() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const { row, loading, save } = useSingleRow<PioneerRow>(
    "pioneer_meetings",
    "id,visit_id,theme,opening_prayer,closing_prayer,location,meeting_at,super_meeting_at",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>;

  const changedByElder =
    !!row.super_meeting_at && !!row.meeting_at && row.super_meeting_at !== row.meeting_at;

  const onSaveDatetime = async (v: string | null) => {
    const iso = v ? localInputToIso(v) : null;
    if (isSuper) {
      // SC redefine a referência original e também o valor atual
      await save({ meeting_at: iso, super_meeting_at: iso });
    } else {
      // Ancião altera só o valor atual; mantemos super_meeting_at original
      const patch: Partial<PioneerRow> = { meeting_at: iso };
      if (!row.super_meeting_at && iso) patch.super_meeting_at = iso;
      await save(patch);
    }
  };

  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <div>
          <Label>Tema:</Label>
          <FieldText value={row.theme} onSave={(v) => save({ theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>Oração Inicial</Label>
          <FieldText value={row.opening_prayer} onSave={(v) => save({ opening_prayer: v })} />
        </div>
        <div>
          <Label>Oração Final</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} />
        </div>
        <div>
          <Label>Local da Reunião</Label>
          <FieldText value={row.location} onSave={(v) => save({ location: v })} />
        </div>
        <div>
          <Label>
            Data e Hora da Reunião
            {isSuper ? " (define a referência)" : " (definida pelo Superintendente)"}
          </Label>
          <Input
            type="datetime-local"
            defaultValue={tsToLocalInput(row.meeting_at)}
            key={row.meeting_at ?? ""}
            onBlur={(e) => {
              const cur = tsToLocalInput(row.meeting_at);
              if (e.target.value !== cur) onSaveDatetime(e.target.value || null);
            }}
            className={`h-9 mt-0.5 ${changedByElder ? "border-destructive text-destructive focus-visible:ring-destructive bg-destructive/5" : ""}`}
          />
          {changedByElder && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alterado em relação à data/hora definida pelo Superintendente
              ({new Date(row.super_meeting_at!).toLocaleString("pt-BR")}).
            </p>
          )}
        </div>
      </fieldset>
    </CardContent></Card>
  );
}

/* ============ ANCIÃOS E SERVOS ============ */
interface EldersRow { id: string; visit_id: string; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }

export function EldersServantsPanel() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const { row, loading, save } = useSingleRow<EldersRow>(
    "elders_servants_meetings",
    "id,visit_id,theme,opening_prayer,closing_prayer",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>;
  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <div>
          <Label>Tema:</Label>
          <FieldText value={row.theme} onSave={(v) => save({ theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>Oração Inicial</Label>
          <FieldText value={row.opening_prayer} onSave={(v) => save({ opening_prayer: v })} />
        </div>
        <div>
          <Label>Oração Final</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} />
        </div>
      </fieldset>
    </CardContent></Card>
  );
}
