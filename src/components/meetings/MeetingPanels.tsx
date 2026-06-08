import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getVisitWeekendThemes } from "@/lib/meeting-talk-templates.functions";
import { useSingleRow } from "./SingleRowPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import { TemplateExtraBlock, TemplateExtraEditable } from "./TemplateExtraBlock";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}

function NoVisit() {
  const { t } = useTranslation();
  return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("meetingsTalks.field.noActiveVisit")}</CardContent></Card>;
}

function LoadingCard() {
  const { t } = useTranslation();
  return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{t("meetingsTalks.loading")}</div>;
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
interface MidweekRow { id: string; visit_id: string; meeting_at: string | null; service_talk_theme: string | null; chairman: string | null; closing_prayer: string | null }

export function MidweekPanel() {
  const { t } = useTranslation();
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const extras = useVisitTemplateExtras(visit?.id);
  const { row, loading, save } = useSingleRow<MidweekRow>(
    "midweek_meetings",
    "id,visit_id,meeting_at,service_talk_theme,chairman,closing_prayer",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <LoadingCard />;
  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <TemplateExtraEditable
        label={t("meetingsTalks.fromTemplate.finalSong")}
        value={extras.midweek?.final_song}
        templateValue={extras.templateExtras.midweek?.final_song}
        visitId={visit.id} field="midweek_final_song"
        editable={isSuper && canEdit}
        onSaved={extras.reload}
      />
      <TemplateExtraEditable
        label={t("meetingsTalks.fromTemplate.observations")}
        value={extras.midweek?.observations}
        templateValue={extras.templateExtras.midweek?.observations}
        visitId={visit.id} field="midweek_observations"
        editable={isSuper && canEdit} type="textarea"
        onSaved={extras.reload}
      />
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <DayTimePicker
          value={row.meeting_at}
          onChange={(iso) => save({ meeting_at: iso })}
          disabled={!canEdit}
          dayLabel={t("meetingsTalks.midweek.meetingDay")}
          timeLabel={t("meetingsTalks.midweek.meetingTime")}
        />
        <div>
          <Label>{t("meetingsTalks.midweek.serviceTalk")}</Label>
          <FieldText value={row.service_talk_theme} onSave={(v) => save({ service_talk_theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>{t("meetingsTalks.midweek.chairman")}</Label>
          <FieldText value={row.chairman} onSave={(v) => save({ chairman: v })} placeholder={t("meetingsTalks.midweek.chairmanPlaceholder")} />
        </div>
        <div>
          <Label>{t("meetingsTalks.midweek.closingPrayer")}</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} placeholder={t("meetingsTalks.midweek.closingPrayerPlaceholder")} />
        </div>
      </fieldset>
      {!canEdit && <p className="text-xs text-muted-foreground">{t("meetingsTalks.midweek.elderEditNote")}</p>}
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

/* ============ Helpers de Dia + Hora (timestamptz âncora) ============ */
// Usamos uma data âncora fixa (2024-01-07 = domingo) + offset do dia da semana
// + HH:MM para serializar em `timestamptz`. Assim, ao reler, recuperamos
// `weekday` (0=Dom..6=Sáb) e `HH:MM` de forma estável e sem deriva de fuso.
const WEEKDAY_ANCHOR_SUNDAY = "2024-01-07";

function isoFromWeekdayTime(weekday: number, hhmm: string): string | null {
  if (weekday == null || Number.isNaN(weekday)) return null;
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const d = new Date(`${WEEKDAY_ANCHOR_SUNDAY}T${hhmm}:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + weekday);
  return d.toISOString();
}
function weekdayFromIso(ts: string | null): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}
function hhmmFromIso(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Bloco reutilizável "Dia + Hora" para Meio de Semana e Fim de Semana.
function DayTimePicker({
  value, onChange, disabled, dayLabel, timeLabel,
}: {
  value: string | null;
  onChange: (iso: string | null) => void | Promise<void>;
  disabled?: boolean;
  dayLabel: string;
  timeLabel: string;
}) {
  const { t } = useTranslation();
  const weekday = weekdayFromIso(value);
  const time = hhmmFromIso(value);
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  const commit = (nextWeekday: number | null, nextTime: string) => {
    if (nextWeekday == null || !nextTime) {
      // só persiste quando ambos estão definidos; senão mantém valor anterior
      // (evita gravar timestamp incompleto).
      return;
    }
    const iso = isoFromWeekdayTime(nextWeekday, nextTime);
    if (iso) onChange(iso);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>{dayLabel}</Label>
        <Select
          value={weekday != null ? String(weekday) : ""}
          onValueChange={(v) => commit(Number(v), time || "00:00")}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 mt-0.5">
            <SelectValue placeholder={dayLabel} />
          </SelectTrigger>
          <SelectContent>
            {dayKeys.map((k, idx) => (
              <SelectItem key={k} value={String(idx)}>
                {t(`meetingsTalks.weekdays.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{timeLabel}</Label>
        <Input
          type="time"
          defaultValue={time}
          key={`${value ?? ""}`}
          disabled={disabled}
          onBlur={(e) => {
            if (weekday == null) return; // exige dia escolhido
            const next = e.target.value;
            if (next && next !== time) commit(weekday, next);
          }}
          className="h-9 mt-0.5"
        />
      </div>
    </div>
  );
}



export function WeekendPanel() {
  const { t } = useTranslation();
  const { visit } = useActiveVisit();
  const { canEdit, role } = useAuth();
  const isSuper = role === "superintendent";
  const extras = useVisitTemplateExtras(visit?.id);
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
    const ch = supabase.channel(`weekend-themes-${visit?.id ?? "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_talk_template_weekend_themes" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [visit?.id]);

  if (!visit) return <NoVisit />;
  if (loading || !row) return <LoadingCard />;

  const onPickTheme = async (id: string) => {
    const th = themes.find((x) => x.id === id);
    await save({ talk_theme_id: id, talk_theme_title: th?.title ?? null });
  };

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      <Card className="max-w-full"><CardContent className="p-4 grid gap-3 max-w-xl min-w-0">
        <TemplateExtraEditable
          label={t("meetingsTalks.fromTemplate.openingSong")}
          value={extras.weekend?.opening_song}
          templateValue={extras.templateExtras.weekend?.opening_song}
          visitId={visit.id} field="weekend_opening_song"
          editable={isSuper && canEdit}
          onSaved={extras.reload}
        />
        <TemplateExtraEditable
          label={t("meetingsTalks.fromTemplate.closingSong")}
          value={extras.weekend?.closing_song}
          templateValue={extras.templateExtras.weekend?.closing_song}
          visitId={visit.id} field="weekend_closing_song"
          editable={isSuper && canEdit}
          onSaved={extras.reload}
        />
        <TemplateExtraEditable
          label={t("meetingsTalks.fromTemplate.observations")}
          value={extras.weekend?.observations}
          templateValue={extras.templateExtras.weekend?.observations}
          visitId={visit.id} field="weekend_observations"
          editable={isSuper && canEdit} type="textarea"
          onSaved={extras.reload}
        />
        <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0 min-w-0">
          <DayTimePicker
            value={row.meeting_at}
            onChange={(iso) => save({ meeting_at: iso })}
            disabled={!canEdit}
            dayLabel={t("meetingsTalks.weekend.meetingDay")}
            timeLabel={t("meetingsTalks.weekend.meetingTime")}
          />

          <div className="min-w-0">
            <Label>{t("meetingsTalks.weekend.publicTalk")}</Label>
            <FieldText
              value={row.public_talk_theme ?? ""}
              readOnly={!isSuper}
              onSave={(v) => save({ public_talk_theme: v || null })}
            />
            {!isSuper && (
              <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal [overflow-wrap:anywhere]">{t("meetingsTalks.weekend.readOnlyNote")}</p>
            )}
          </div>
          <div className="min-w-0">
            <Label>{t("meetingsTalks.weekend.finalTalk")}</Label>
            {themes.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal [overflow-wrap:anywhere]">
                {isSuper
                  ? t("meetingsTalks.weekend.noThemesSuper")
                  : t("meetingsTalks.weekend.noThemesElder")}
              </p>
            ) : (
              <Select value={row.talk_theme_id ?? ""} onValueChange={onPickTheme}>
                <SelectTrigger className="h-9 mt-0.5 w-full min-w-0"><SelectValue placeholder={t("meetingsTalks.weekend.pickTheme")} /></SelectTrigger>
                <SelectContent className="max-w-[90vw]">
                  {themes.map((th) => <SelectItem key={th.id} value={th.id} className="whitespace-normal break-words [overflow-wrap:anywhere]">{th.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {row.talk_theme_title && themes.length > 0 && !themes.find((th) => th.id === row.talk_theme_id) && (
              <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal [overflow-wrap:anywhere]">{t("meetingsTalks.weekend.selectedTheme", { title: row.talk_theme_title })}</p>
            )}
          </div>
        </fieldset>
      </CardContent></Card>
    </div>
  );
}

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
  const { t } = useTranslation();
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const extras = useVisitTemplateExtras(visit?.id);
  const { row, loading, save } = useSingleRow<PioneerRow>(
    "pioneer_meetings",
    "id,visit_id,theme,opening_prayer,closing_prayer,location,meeting_at,super_meeting_at",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <LoadingCard />;

  const wd = extras.pioneer?.weekday;
  const mt = extras.pioneer?.meeting_time;
  const scheduleText = (() => {
    if (wd == null && !mt) return null;
    const dayLabel = wd != null ? t(`templates.weekdays.${wd}`) : "—";
    const timeLabel = mt ? mt.slice(0, 5) : "—";
    return `${dayLabel} — ${timeLabel}`;
  })();

  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <TemplateExtraBlock label={t("meetingsTalks.fromTemplate.schedule")} value={scheduleText} />
      <TemplateExtraBlock label={t("meetingsTalks.fromTemplate.observations")} value={extras.pioneer?.observations} />
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <div>
          <Label>{t("meetingsTalks.pioneer.theme")}</Label>
          <FieldText value={row.theme} onSave={(v) => save({ theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>{t("meetingsTalks.pioneer.openingPrayer")}</Label>
          <FieldText value={row.opening_prayer} onSave={(v) => save({ opening_prayer: v })} />
        </div>
        <div>
          <Label>{t("meetingsTalks.pioneer.closingPrayer")}</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} />
        </div>
        <div>
          <Label>{t("meetingsTalks.pioneer.location")}</Label>
          <FieldText value={row.location} onSave={(v) => save({ location: v })} />
        </div>
      </fieldset>
    </CardContent></Card>
  );
}

/* ============ ANCIÃOS E SERVOS ============ */
interface EldersRow {
  id: string;
  visit_id: string;
  theme: string | null;
  opening_prayer: string | null;
  closing_prayer: string | null;
  location: string | null;
  meeting_at: string | null;
}

export function EldersServantsPanel() {
  const { t } = useTranslation();
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const extras = useVisitTemplateExtras(visit?.id);
  const { row, loading, save } = useSingleRow<EldersRow>(
    "elders_servants_meetings",
    "id,visit_id,theme,opening_prayer,closing_prayer,location,meeting_at",
    visit,
  );
  if (!visit) return <NoVisit />;
  if (loading || !row) return <LoadingCard />;
  const wd = extras.elders?.weekday;
  const mt = extras.elders?.meeting_time;
  const scheduleText = (() => {
    if (wd == null && !mt) return null;
    const dayLabel = wd != null ? t(`templates.weekdays.${wd}`) : "—";
    const timeLabel = mt ? mt.slice(0, 5) : "—";
    return `${dayLabel} — ${timeLabel}`;
  })();
  return (
    <Card><CardContent className="p-4 grid gap-3 max-w-xl">
      <TemplateExtraBlock label={t("meetingsTalks.fromTemplate.schedule")} value={scheduleText} />
      <TemplateExtraBlock label={t("meetingsTalks.fromTemplate.observations")} value={extras.elders?.observations} />
      <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-70 border-0 p-0 m-0">
        <div>
          <Label>{t("meetingsTalks.elders.theme")}</Label>
          <FieldText value={row.theme} onSave={(v) => save({ theme: v })} readOnly={!isSuper} />
        </div>
        <div>
          <Label>{t("meetingsTalks.elders.openingPrayer")}</Label>
          <FieldText value={row.opening_prayer} onSave={(v) => save({ opening_prayer: v })} />
        </div>
        <div>
          <Label>{t("meetingsTalks.elders.closingPrayer")}</Label>
          <FieldText value={row.closing_prayer} onSave={(v) => save({ closing_prayer: v })} />
        </div>
        <div>
          <Label>{t("meetingsTalks.elders.location", { defaultValue: t("meetingsTalks.pioneer.location") })}</Label>
          <FieldText value={row.location} onSave={(v) => save({ location: v })} />
        </div>
      </fieldset>
    </CardContent></Card>
  );
}
