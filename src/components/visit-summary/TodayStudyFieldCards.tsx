import { useTranslation } from "react-i18next";
import { BookOpen, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InfoList } from "./InfoList";
import { FoldCard } from "./FoldCard";

type Str = string | null | undefined;
export type TodayStudy = {
  id: string; period?: Str; meeting_time?: Str; meeting_point?: Str;
  acompanhante?: Str; acompanhante_for?: Str; contact_phone?: Str; notes?: Str;
};
export type TodayFieldMeeting = {
  id: string; period?: Str; meeting_time?: Str; modality?: Str; meeting_location?: Str;
  territory_number?: Str; territory_location?: Str; auxiliary_leaders?: Str;
  closing_prayer?: Str; observations?: Str;
};

/** Dois cartões separados: Estudos do dia e Reunião de campo do dia. Cada um some se vazio. */
export function TodayStudyFieldCards({
  studies, fieldMeetings, fmtTime, plain = false, foldScope,
}: {
  studies: TodayStudy[];
  fieldMeetings: TodayFieldMeeting[];
  fmtTime: (v: string | null) => string;
  plain?: boolean;
  /** Quando informado, cada cartão pode ser recolhido (estado salvo no aparelho). */
  foldScope?: string;
}) {
  const { t } = useTranslation();
  const head = (p: Str, time: Str, extra?: Str) => [p, fmtTime(time ?? null), extra].filter(Boolean).join(" • ");

  const blocks = [
    studies.length > 0 && {
      key: "studies",
      icon: <BookOpen className="h-4 w-4" />,
      title: t("guest.today.studies"),
      items: studies.map((f) => (
        <div key={f.id} className="border-l-2 border-primary/30 pl-3 py-1 space-y-1">
          <div className="text-sm font-medium">{head(f.period, f.meeting_time)}</div>
          <InfoList rows={[
            [t("guest.labels.meetingPoint"), f.meeting_point],
            [t("guest.labels.companion"), f.acompanhante],
            [t("guest.labels.companionFor"), f.acompanhante_for],
            [t("guest.labels.phone"), f.contact_phone],
            [t("guest.labels.notes"), f.notes],
          ]} />
        </div>
      )),
    },
    fieldMeetings.length > 0 && {
      key: "field",
      icon: <Compass className="h-4 w-4" />,
      title: t("guest.today.field"),
      items: fieldMeetings.map((f) => (
        <div key={f.id} className="border-l-2 border-primary/30 pl-3 py-1 space-y-1">
          <div className="text-sm font-medium">{head(f.period, f.meeting_time, f.modality)}</div>
          <InfoList rows={[
            [t("guest.labels.location"), f.meeting_location],
            [t("guest.labels.territoryS13"), f.territory_number],
            [t("guest.labels.territoryLocation"), f.territory_location],
            [t("guest.labels.leaders"), f.auxiliary_leaders],
            [t("guest.labels.closingPrayer"), f.closing_prayer],
            [t("guest.labels.notes"), f.observations],
          ]} />
        </div>
      )),
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; title: string; items: React.ReactNode[] }[];

  return (
    <>
      {blocks.map((b) => {
        if (foldScope) {
          return (
            <FoldCard key={b.key} id={`${foldScope}:${b.key}`} icon={b.icon} title={b.title}>
              <div className="space-y-2">{b.items}</div>
            </FoldCard>
          );
        }
        const body = (
          <>
            <div className="flex items-center gap-2 font-semibold text-sm">{b.icon} {b.title}</div>
            <div className="space-y-2">{b.items}</div>
          </>
        );
        return plain ? (
          <section key={b.key} className="space-y-1">{body}</section>
        ) : (
          <Card key={b.key}><CardContent className="p-4 space-y-2">{body}</CardContent></Card>
        );
      })}
    </>
  );
}
