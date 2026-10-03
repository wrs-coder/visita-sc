// Subaba "Reuniões" compartilhada entre o painel dos anciãos/ESC e o
// Resumo da Semana do superintendente. Dia/horário seguem a aba
// "Reuniões e Discursos" (data âncora ou extras do modelo/visita).
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Users, BookOpen, MapPin } from "lucide-react";
import { TemplateExtraBlock } from "@/components/meetings/TemplateExtraBlock";
import { formatWeekdayTime, formatAnchorWeekdayTime } from "@/components/visit-week/report-schedule";
import type { VisitTemplateExtras } from "@/lib/visit-template-extras.shared";

const FINAL_SONG = "Cântico final";

export interface MeetingsTalksSnap {
  midweek: Array<{ id: string; meeting_at?: string | null; chairman: string | null; service_talk_theme: string | null; closing_prayer: string | null }>;
  weekend: Array<{ id: string; meeting_at: string | null; public_talk_theme: string | null; talk_theme_title: string | null }>;
  pioneer: Array<{ id: string; location: string | null; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  elders: Array<{ id: string; location?: string | null; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  templateExtras?: VisitTemplateExtras;
}

export function MeetingsTalksPanel({ snap }: { snap: MeetingsTalksSnap }) {
  const { t } = useTranslation();
  const ex = snap.templateExtras;
  const pioneerWhen = formatWeekdayTime(ex?.pioneer?.weekday, ex?.pioneer?.meeting_time);
  const eldersWhen = formatWeekdayTime(ex?.elders?.weekday, ex?.elders?.meeting_time);

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? <div className="text-xs"><span className="text-muted-foreground">{label}: </span>{value}</div> : null;

  const sections = [
    {
      key: "midweek",
      title: t("guest.meetingsTalks.midweek"),
      icon: <Mic className="h-4 w-4 text-primary" />,
      hasExtra: !!ex?.midweek?.observations,
      empty: snap.midweek.length === 0,
      content: (
        <>
          <TemplateExtraBlock label={t("guest.meetingsTalks.midweek")} value={ex?.midweek?.observations} variant="blue" />
          {snap.midweek.map((m) => (
            <Card key={m.id}><CardContent className="p-3 space-y-1">
              <div className="text-xs font-semibold text-primary">{formatAnchorWeekdayTime(m.meeting_at)}</div>
              <Row label={t("guest.labels.chairman")} value={m.chairman} />
              <Row label={t("guest.labels.serviceTalk")} value={m.service_talk_theme} />
              <Row label={FINAL_SONG} value={ex?.midweek?.final_song} />
              <Row label={t("guest.labels.closingPrayer")} value={m.closing_prayer} />
            </CardContent></Card>
          ))}
        </>
      ),
    },
    {
      key: "weekend",
      title: t("guest.meetingsTalks.weekend"),
      icon: <Mic className="h-4 w-4 text-primary" />,
      hasExtra: !!(ex?.weekend?.observations || ex?.weekend?.opening_song || ex?.weekend?.closing_song),
      empty: snap.weekend.length === 0,
      content: (
        <>
          {(ex?.weekend?.opening_song || ex?.weekend?.closing_song) && (
            <Card><CardContent className="p-3 space-y-1">
              <Row label={t("guest.meetingsTalks.openingSong")} value={ex?.weekend?.opening_song} />
              <Row label={t("guest.meetingsTalks.closingSong")} value={ex?.weekend?.closing_song} />
            </CardContent></Card>
          )}
          <TemplateExtraBlock label={t("guest.meetingsTalks.weekend")} value={ex?.weekend?.observations} variant="blue" />
          {snap.weekend.map((w) => (
            <Card key={w.id}><CardContent className="p-3 space-y-1">
              <div className="text-xs font-semibold text-primary">{formatAnchorWeekdayTime(w.meeting_at)}</div>
              <Row label={t("guest.labels.publicTalk")} value={w.public_talk_theme} />
              <Row label={t("guest.labels.finalTalk")} value={w.talk_theme_title} />
            </CardContent></Card>
          ))}
        </>
      ),
    },
    {
      key: "pioneer",
      title: t("guest.meetingsTalks.pioneer"),
      icon: <Users className="h-4 w-4 text-primary" />,
      hasExtra: !!ex?.pioneer?.observations,
      empty: snap.pioneer.length === 0,
      content: (
        <>
          <TemplateExtraBlock label={t("guest.meetingsTalks.pioneer")} value={ex?.pioneer?.observations} variant="blue" />
          {snap.pioneer.map((p) => (
            <Card key={p.id}><CardContent className="p-3 space-y-1">
              <div className="text-xs font-semibold text-primary">{pioneerWhen}</div>
              {p.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</div>}
              <Row label={t("guest.labels.theme")} value={p.theme} />
              <Row label={t("guest.labels.openingPrayer")} value={p.opening_prayer} />
              <Row label={t("guest.labels.closingPrayer")} value={p.closing_prayer} />
            </CardContent></Card>
          ))}
        </>
      ),
    },
    {
      key: "elders",
      title: t("guest.meetingsTalks.elders"),
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      hasExtra: !!ex?.elders?.observations,
      empty: snap.elders.length === 0,
      content: (
        <>
          <TemplateExtraBlock label={t("guest.meetingsTalks.elders")} value={ex?.elders?.observations} variant="blue" />
          {snap.elders.map((e) => (
            <Card key={e.id}><CardContent className="p-3 space-y-1">
              <div className="text-xs font-semibold text-primary">{eldersWhen}</div>
              {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
              <Row label={t("guest.labels.theme")} value={e.theme} />
              <Row label={t("guest.labels.openingPrayer")} value={e.opening_prayer} />
              <Row label={t("guest.labels.closingPrayer")} value={e.closing_prayer} />
            </CardContent></Card>
          ))}
        </>
      ),
    },
  ];

  if (sections.every((s) => s.empty && !s.hasExtra)) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{t("guest.meetingsTalks.empty")}</CardContent></Card>
    );
  }

  return (
    <>
      {sections.map((s) => (
        <div key={s.key} className="space-y-2">
          <div className="flex items-center gap-2">
            {s.icon}
            <h3 className="font-semibold text-sm">{s.title}</h3>
          </div>
          {s.empty && !s.hasExtra ? (
            <Card><CardContent className="p-3 text-xs text-muted-foreground">{t("guest.meetingsTalks.empty")}</CardContent></Card>
          ) : (
            <div className="space-y-2">{s.content}</div>
          )}
        </div>
      ))}
    </>
  );
}
