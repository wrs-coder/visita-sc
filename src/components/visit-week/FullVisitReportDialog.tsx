// Diálogo "Relatório executivo completo" da visita (usado no Dashboard e na
// página /relatorio/$visitId). Reutiliza a mesma engine premium em pdf-lib
// (`generateVisitWeekPdf`) das abas da Semana da Visita, em vez do antigo
// `window.print()` — que produzia apenas um "print" da tela.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import { kv, type ReportSection } from "./pdf-utils";

type Row = Record<string, unknown>;

const s = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

const fmtDay = (d?: unknown) => {
  const v = s(d);
  if (!v) return "";
  try {
    return format(parseISO(v.slice(0, 10)), "EEEE, d MMM yyyy", { locale: ptBR });
  } catch {
    return v;
  }
};
const fmtDateTime = (d?: unknown) => {
  const v = s(d);
  if (!v) return "";
  try {
    return format(parseISO(v), "EEEE, d MMM yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return v;
  }
};
const fmtTime = (v: unknown) => {
  const t = s(v);
  return t ? t.slice(0, 5) : null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

export function FullVisitReportDialog({
  open,
  onOpenChange,
  visitId,
  visitTitle,
  congregationName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: v } = await supabase
          .from("visits")
          .select("*")
          .eq("id", visitId)
          .maybeSingle();

        const [sc, me, tr, fa, fm, mw, we, pi, el, cl] = await Promise.all([
          supabase.from("schedule_events").select("*").eq("visit_id", visitId).order("event_date").order("start_time"),
          supabase.from("meals").select("*").eq("visit_id", visitId).eq("is_active", true).order("meal_date").order("meal_time"),
          supabase.from("transport_schedule").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date"),
          supabase.from("field_assignments").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date").order("period"),
          supabase.from("field_meetings").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date").order("period"),
          supabase.from("midweek_meetings").select("*").eq("visit_id", visitId),
          supabase.from("weekend_meetings").select("*").eq("visit_id", visitId),
          supabase.from("pioneer_meetings").select("*").eq("visit_id", visitId),
          supabase.from("elders_servants_meetings").select("*").eq("visit_id", visitId),
          supabase.from("checklist_items").select("*").eq("visit_id", visitId).order("sort_order"),
        ]);
        if (cancelled) return;

        const visit = (v ?? {}) as Row;
        const rows = (r: { data: unknown }) => ((r.data ?? []) as Row[]);

        const out: ReportSection[] = [];

        out.push({
          id: "identificacao",
          title: "IDENTIFICAÇÃO DA VISITA",
          blocks: [
            {
              heading: null,
              lines: [
                kv("Congregação", congregationName ?? null),
                kv("Tipo de visita", s(visit.title) ?? visitTitle),
                kv(
                  "Período",
                  visit.start_date
                    ? `${fmtDay(visit.start_date)} a ${fmtDay(visit.end_date)}`
                    : null,
                ),
                kv("Substituto", s(visit.substitute_name)),
                kv("Telefone do substituto", s(visit.substitute_phone)),
              ].filter((x): x is string => !!x),
            },
          ],
        });

        out.push({
          id: "cronograma",
          title: "CRONOGRAMA",
          emptyMessage: "— Sem eventos no cronograma —",
          blocks: rows(sc).map((e) => ({
            heading: `${fmtDay(e.event_date)}${fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}`,
            lines: [
              kv("Evento", s(e.title)),
              kv("Local", s(e.location)),
              kv("Término", fmtTime(e.end_time)),
              kv("Notas", s(e.notes ?? e.description)),
            ].filter((x): x is string => !!x),
          })),
        });

        out.push({
          id: "refeicoes",
          title: "REFEIÇÕES",
          emptyMessage: "— Sem refeições registradas —",
          blocks: rows(me).map((m) => ({
            heading: `${fmtDay(m.meal_date)}${fmtTime(m.meal_time) ? ` · ${fmtTime(m.meal_time)}` : ""}`,
            lines: [
              kv("Tipo", s(m.type)),
              kv("Anfitrião(ã)", s(m.host_name)),
              kv("Endereço", s(m.location)),
              kv("Telefone", s(m.contact_phone)),
              kv("Notas", s(m.notes)),
            ].filter((x): x is string => !!x),
          })),
        });

        out.push({
          id: "transporte",
          title: "TRANSPORTE",
          emptyMessage: "— Sem transportes registrados —",
          blocks: rows(tr).map((x) => ({
            heading: fmtDay(x.event_date) || "Transporte",
            lines: [
              kv("Motorista", s(x.driver_name)),
              kv("Telefone", s(x.contact_phone)),
              kv("Horário", fmtTime(x.event_time)),
              kv("Descrição", s(x.description)),
              kv("Observações", s(x.observations)),
            ].filter((x2): x2 is string => !!x2),
          })),
        });

        out.push({
          id: "designacoes",
          title: "DESIGNAÇÕES DE CAMPO",
          emptyMessage: "— Sem designações —",
          blocks: rows(fa).map((a) => ({
            heading: `${fmtDay(a.event_date)}${a.period ? ` · ${s(a.period)}` : ""}`,
            lines: [
              kv("Acompanhante", s(a.acompanhante)),
              kv("Ponto de encontro", s(a.meeting_point)),
              kv("Horário", fmtTime(a.start_time)),
              kv("Observações", s(a.observations ?? a.notes)),
            ].filter((x): x is string => !!x),
          })),
        });

        out.push({
          id: "reunioes-campo",
          title: "REUNIÕES PARA O SERVIÇO DE CAMPO",
          emptyMessage: "— Sem reuniões de campo —",
          blocks: rows(fm).map((f) => ({
            heading: `${fmtDay(f.event_date)}${f.period ? ` · ${s(f.period)}` : ""}${fmtTime(f.meeting_time) ? ` · ${fmtTime(f.meeting_time)}` : ""}`,
            lines: [
              kv("Modalidade", s(f.modality)),
              kv("Local", s(f.meeting_location)),
              kv(
                "Território",
                [s(f.territory_number), s(f.territory_location)].filter(Boolean).join(" — ") || null,
              ),
              kv("Dirigentes auxiliares", s(f.auxiliary_leaders)),
              kv("Oração final", s(f.closing_prayer)),
              kv("Observações", s(f.observations)),
            ].filter((x): x is string => !!x),
          })),
        });

        out.push({
          id: "meio-semana",
          title: "REUNIÃO DO MEIO DE SEMANA",
          emptyMessage: "— Sem dados —",
          blocks: rows(mw).map((x) => ({
            heading: x.meeting_at ? fmtDateTime(x.meeting_at) : "Reunião do meio de semana",
            lines: [
              kv("Presidente", s(x.chairman)),
              kv("Discurso do serviço", s(x.service_talk_theme)),
              kv("Oração final", s(x.closing_prayer)),
            ].filter((l): l is string => !!l),
          })),
        });

        out.push({
          id: "fim-semana",
          title: "REUNIÃO DO FIM DE SEMANA",
          emptyMessage: "— Sem dados —",
          blocks: rows(we).map((x) => ({
            heading: x.meeting_at ? fmtDateTime(x.meeting_at) : "Reunião do fim de semana",
            lines: [
              kv("Discurso público", s(x.public_talk_theme)),
              kv("Tema da Sentinela", s(x.talk_theme_title)),
            ].filter((l): l is string => !!l),
          })),
        });

        out.push({
          id: "pioneiros",
          title: "REUNIÃO COM PIONEIROS",
          emptyMessage: "— Sem dados —",
          blocks: rows(pi).map((x) => ({
            heading: x.meeting_at ? fmtDateTime(x.meeting_at) : "Reunião com pioneiros",
            lines: [
              kv("Tema", s(x.theme)),
              kv("Local", s(x.location)),
              kv("Reunião com o SC", x.super_meeting_at ? fmtDateTime(x.super_meeting_at) : null),
              kv("Oração inicial", s(x.opening_prayer)),
              kv("Oração final", s(x.closing_prayer)),
            ].filter((l): l is string => !!l),
          })),
        });

        out.push({
          id: "ancioes",
          title: "REUNIÃO COM ANCIÃOS E SERVOS MINISTERIAIS",
          emptyMessage: "— Sem dados —",
          blocks: rows(el).map((x) => ({
            heading: x.meeting_at ? fmtDateTime(x.meeting_at) : "Reunião com anciãos e servos",
            lines: [
              kv("Tema", s(x.theme)),
              kv("Local", s(x.location)),
              kv("Oração inicial", s(x.opening_prayer)),
              kv("Oração final", s(x.closing_prayer)),
            ].filter((l): l is string => !!l),
          })),
        });

        out.push({
          id: "checklist",
          title: "CHECKLIST",
          emptyMessage: "— Sem itens no checklist —",
          blocks: rows(cl).map((c) => ({
            heading: `${c.status === "done" ? "[concluído]" : "[pendente]"} ${s(c.title) ?? ""}`.trim(),
            lines: [kv("Notas", s(c.notes))].filter((l): l is string => !!l),
          })),
        });

        setSections(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visitId, visitTitle, congregationName]);

  return (
    <VisitWeekReportDialog
      open={open}
      onOpenChange={onOpenChange}
      tabLabel="Visita completa"
      tabSlug="visita-completa"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
