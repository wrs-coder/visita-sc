// Diálogo "Relatório executivo" da aba Resumo da Semana.
// Carrega os eventos do cronograma (schedule_events) da visita ativa e os
// agrupa por dia, gerando blocos no PDF.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface ScheduleRow {
  id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  title: string;
  location: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

const fmtTime = (s: string | null) => (s ? s.slice(0, 5) : "");
const fmtDay = (d: string) => {
  try {
    return format(parseISO(d), "EEEE, d MMM yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

export function WeekSummaryReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("schedule_events")
        .select("id,event_date,start_time,end_time,type,title,location,notes,is_active")
        .eq("visit_id", visitId)
        .eq("is_active", true)
        .order("event_date")
        .order("start_time");
      if (cancelled) return;

      const rows = (data ?? []) as ScheduleRow[];
      const byDay = new Map<string, ScheduleRow[]>();
      for (const r of rows) {
        const k = r.event_date;
        const arr = byDay.get(k) ?? [];
        arr.push(r);
        byDay.set(k, arr);
      }

      const out: ReportSection[] = Array.from(byDay.entries()).map(([day, evs]) => ({
        id: `day-${day}`,
        title: fmtDay(day).toUpperCase(),
        blocks: evs.map((ev) => ({
          heading: [fmtTime(ev.start_time), ev.title].filter(Boolean).join(" — "),
          lines: [
            kv("Tipo", ev.type),
            kv("Horário", [fmtTime(ev.start_time), fmtTime(ev.end_time)].filter(Boolean).join(" → ")),
            kv("Local", ev.location),
            kv("Notas", ev.notes),
          ].filter((x): x is string => !!x),
        })),
      }));

      setSections(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visitId]);

  return (
    <VisitWeekReportDialog
      open={open}
      onOpenChange={onOpenChange}
      tabLabel="Resumo da Semana"
      tabSlug="resumo-semana"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
