// Diálogo "Relatório executivo" da aba Estudos de Campo (escala).
// Uma seção por dia, blocos por turno (Manhã / Tarde).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface Row {
  id: string;
  event_date: string;
  period: string;
  meeting_point: string | null;
  meeting_time: string | null;
  acompanhante: string | null;
  acompanhante_for: string | null;
  contact_phone: string | null;
  is_active: boolean;
}

const COMPANION_FOR_LABEL: Record<string, string> = {
  superintendente: "Superintendente",
  esposa: "Esposa do superintendente",
  sc_substituto: "SC substituto",
  esposa_sc_substituto: "Esposa do SC substituto",
  sc_pastor: "SC pastor",
  esposa_sc_pastor: "Esposa do SC pastor",
};

const fmtDay = (d: string) => {
  try {
    return format(parseISO(d), "EEEE, d MMM yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

export function FieldStudiesReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("field_assignments")
        .select("id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone,is_active")
        .eq("visit_id", visitId)
        .eq("is_active", true)
        .order("event_date")
        .order("period");
      if (cancelled) return;

      const rows = (data ?? []) as Row[];
      const byDay = new Map<string, Row[]>();
      for (const r of rows) {
        const arr = byDay.get(r.event_date) ?? [];
        arr.push(r);
        byDay.set(r.event_date, arr);
      }

      const out: ReportSection[] = Array.from(byDay.entries()).map(([day, list]) => ({
        id: `day-${day}`,
        title: fmtDay(day).toUpperCase(),
        blocks: list.map((r) => ({
          heading: `${r.period}${r.meeting_time ? ` · ${r.meeting_time.slice(0, 5)}` : ""}`,
          lines: [
            kv("Ponto de encontro", r.meeting_point),
            kv("Acompanhante", r.acompanhante),
            kv("Acompanhante de", r.acompanhante_for ? (COMPANION_FOR_LABEL[r.acompanhante_for] ?? r.acompanhante_for) : null),
            kv("Telefone de contato", r.contact_phone),
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
      tabLabel="Estudos de Campo"
      tabSlug="estudos-campo"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
