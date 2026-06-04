// Diálogo "Relatório executivo" da aba Transporte.
// Uma seção por dia (ou "Sem dia específico").

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface Row {
  id: string;
  driver_name: string;
  contact_phone: string | null;
  event_date: string | null;
  event_type: string | null;
  direction: string | null;
  all_day: boolean;
  departure_time: string | null;
  return_time: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
}

const fmtDay = (d: string) => {
  try {
    return format(parseISO(d), "EEEE, d MMM yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};
const fmtTime = (s: string | null) => (s ? s.slice(0, 5) : "");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

export function TransportReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transport_schedule")
        .select("*")
        .eq("visit_id", visitId)
        .eq("is_active", true)
        .order("event_date", { nullsFirst: false })
        .order("departure_time", { nullsFirst: false });
      if (cancelled) return;

      const rows = (data ?? []) as Row[];
      const byDay = new Map<string, Row[]>();
      for (const r of rows) {
        const k = r.event_date ?? "__none__";
        const arr = byDay.get(k) ?? [];
        arr.push(r);
        byDay.set(k, arr);
      }

      const out: ReportSection[] = Array.from(byDay.entries()).map(([day, list]) => ({
        id: `day-${day}`,
        title: day === "__none__" ? "SEM DIA ESPECÍFICO" : fmtDay(day).toUpperCase(),
        blocks: list.map((r) => ({
          heading: r.driver_name,
          lines: [
            kv("Tipo de evento", r.event_type),
            kv("Direção", r.direction),
            r.all_day ? "Dia inteiro: sim" : null,
            kv("Saída", fmtTime(r.departure_time)),
            kv("Retorno", fmtTime(r.return_time)),
            kv("Telefone", r.contact_phone),
            kv("Descrição", r.description),
            kv("Notas", r.notes),
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
      tabLabel="Transporte"
      tabSlug="transporte"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
