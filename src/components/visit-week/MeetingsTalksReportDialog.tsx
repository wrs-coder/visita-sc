// Diálogo "Relatório executivo" da aba Reuniões e Discursos.
// Inclui as 5 subabas como seções: Campo, Meio de semana, Fim de semana,
// Pioneiros, Anciãos e Servos Ministeriais — cada uma com seu próprio
// texto opcional de "Informações adicionais do superintendente" vindo do
// modelo vinculado (via useVisitTemplateExtras).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface FieldMeetingRow {
  id: string;
  event_date: string;
  period: string;
  modality: string;
  meeting_time: string | null;
  meeting_location: string | null;
  territory_number: string | null;
  territory_location: string | null;
  auxiliary_leaders: string | null;
  closing_prayer: string | null;
  observations: string | null;
  is_active: boolean;
}

interface MidweekRow {
  chairman: string | null;
  service_talk_theme: string | null;
  closing_prayer: string | null;
  meeting_at: string | null;
}
interface WeekendRow {
  meeting_at: string | null;
  public_talk_theme: string | null;
  talk_theme_title: string | null;
}
interface PioneerRow {
  theme: string | null;
  location: string | null;
  meeting_at: string | null;
  super_meeting_at: string | null;
  opening_prayer: string | null;
  closing_prayer: string | null;
}
interface EldersRow {
  theme: string | null;
  location: string | null;
  meeting_at: string | null;
  opening_prayer: string | null;
  closing_prayer: string | null;
}

const fmtDay = (d: string | null) => {
  if (!d) return "";
  try {
    return format(parseISO(d), "EEEE, d MMM yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};
const fmtDateTime = (iso: string | null) => {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "EEEE, d MMM yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

export function MeetingsTalksReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const extras = useVisitTemplateExtras(open ? visitId : null);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: fm }, { data: mw }, { data: we }, { data: pi }, { data: el }] = await Promise.all([
        supabase
          .from("field_meetings")
          .select(
            "id,event_date,period,modality,meeting_time,meeting_location,territory_number,territory_location,auxiliary_leaders,closing_prayer,observations,is_active",
          )
          .eq("visit_id", visitId)
          .eq("is_active", true)
          .order("event_date")
          .order("period"),
        supabase
          .from("midweek_meetings")
          .select("chairman,service_talk_theme,closing_prayer,meeting_at")
          .eq("visit_id", visitId)
          .maybeSingle(),
        supabase
          .from("weekend_meetings")
          .select("meeting_at,public_talk_theme,talk_theme_title")
          .eq("visit_id", visitId)
          .maybeSingle(),
        supabase
          .from("pioneer_meetings")
          .select("theme,location,meeting_at,super_meeting_at,opening_prayer,closing_prayer")
          .eq("visit_id", visitId)
          .maybeSingle(),
        supabase
          .from("elders_servants_meetings")
          .select("theme,location,meeting_at,opening_prayer,closing_prayer")
          .eq("visit_id", visitId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const fieldRows = (fm ?? []) as FieldMeetingRow[];
      const fieldBlocks = fieldRows.map((r) => ({
        heading: `${fmtDay(r.event_date)} · ${r.period}${r.meeting_time ? ` · ${r.meeting_time.slice(0, 5)}` : ""}`,
        lines: [
          kv("Modalidade", r.modality),
          kv("Local", r.meeting_location),
          kv("Território", [r.territory_number, r.territory_location].filter(Boolean).join(" — ")),
          kv("Dirigentes auxiliares", r.auxiliary_leaders),
          kv("Oração final", r.closing_prayer),
          kv("Observações", r.observations),
        ].filter((x): x is string => !!x),
      }));

      const midweek = mw as MidweekRow | null;
      const midweekBlocks = midweek
        ? [
            {
              heading: midweek.meeting_at ? fmtDateTime(midweek.meeting_at) : "Reunião do meio de semana",
              lines: [
                kv("Presidente", midweek.chairman),
                kv("Discurso do serviço", midweek.service_talk_theme),
                kv("Oração final", midweek.closing_prayer),
              ].filter((x): x is string => !!x),
            },
          ]
        : [];

      const weekend = we as WeekendRow | null;
      const weekendBlocks = weekend
        ? [
            {
              heading: weekend.meeting_at ? fmtDateTime(weekend.meeting_at) : "Reunião do fim de semana",
              lines: [
                kv("Discurso público", weekend.public_talk_theme),
                kv("Tema da Sentinela", weekend.talk_theme_title),
              ].filter((x): x is string => !!x),
            },
          ]
        : [];

      const pioneer = pi as PioneerRow | null;
      const pioneerBlocks = pioneer
        ? [
            {
              heading: pioneer.meeting_at ? fmtDateTime(pioneer.meeting_at) : "Reunião com pioneiros",
              lines: [
                kv("Tema", pioneer.theme),
                kv("Local", pioneer.location),
                kv("Reunião com o SC", pioneer.super_meeting_at ? fmtDateTime(pioneer.super_meeting_at) : null),
                kv("Oração inicial", pioneer.opening_prayer),
                kv("Oração final", pioneer.closing_prayer),
              ].filter((x): x is string => !!x),
            },
          ]
        : [];

      const elders = el as EldersRow | null;
      const eldersBlocks = elders
        ? [
            {
              heading: elders.meeting_at ? fmtDateTime(elders.meeting_at) : "Reunião com anciãos e servos ministeriais",
              lines: [
                kv("Tema", elders.theme),
                kv("Local", elders.location),
                kv("Oração inicial", elders.opening_prayer),
                kv("Oração final", elders.closing_prayer),
              ].filter((x): x is string => !!x),
            },
          ]
        : [];

      setSections([
        {
          id: "campo",
          title: "REUNIÕES PARA O SERVIÇO DE CAMPO",
          additionalInfo: extras.field?.observations ?? null,
          blocks: fieldBlocks,
        },
        {
          id: "meio",
          title: "REUNIÃO DO MEIO DE SEMANA",
          additionalInfo: extras.midweek?.observations ?? null,
          blocks: midweekBlocks,
        },
        {
          id: "fim",
          title: "REUNIÃO DO FIM DE SEMANA",
          additionalInfo: extras.weekend?.observations ?? null,
          blocks: weekendBlocks,
        },
        {
          id: "pioneiros",
          title: "REUNIÃO COM PIONEIROS",
          additionalInfo: extras.pioneer?.observations ?? null,
          blocks: pioneerBlocks,
        },
        {
          id: "ancios",
          title: "REUNIÃO COM ANCIÃOS E SERVOS MINISTERIAIS",
          additionalInfo: extras.elders?.observations ?? null,
          blocks: eldersBlocks,
        },
      ]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visitId, extras]);

  return (
    <VisitWeekReportDialog
      open={open}
      onOpenChange={onOpenChange}
      tabLabel="Reuniões e Discursos"
      tabSlug="reunioes-discursos"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      showAdditionalInfoToggle
      loading={loading}
    />
  );
}
