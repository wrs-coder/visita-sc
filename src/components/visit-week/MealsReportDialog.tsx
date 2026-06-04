// Diálogo "Relatório executivo" da aba Refeições.
// Uma seção por dia (com observações do dia) + uma seção com as
// "Observações gerais" vindas do modelo vinculado.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface MealRow {
  id: string;
  meal_date: string;
  type: "breakfast" | "lunch" | "dinner";
  host_name: string | null;
  location: string | null;
  contact_phone: string | null;
  meal_time: string | null;
  notes: string | null;
  is_active: boolean;
}

const MEAL_LABEL: Record<MealRow["type"], string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  dinner: "Jantar",
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

export function MealsReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const extras = useVisitTemplateExtras(open ? visitId : null);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: meals }, { data: notes }] = await Promise.all([
        supabase
          .from("meals")
          .select("id,meal_date,type,host_name,location,contact_phone,meal_time,notes,is_active")
          .eq("visit_id", visitId)
          .eq("is_active", true)
          .order("meal_date")
          .order("type"),
        supabase
          .from("meal_day_notes")
          .select("meal_date,notes")
          .eq("visit_id", visitId),
      ]);
      if (cancelled) return;

      const dayNotes = new Map<string, string>();
      for (const n of (notes ?? []) as Array<{ meal_date: string; notes: string }>) {
        dayNotes.set(n.meal_date, n.notes);
      }

      const byDay = new Map<string, MealRow[]>();
      for (const m of (meals ?? []) as MealRow[]) {
        const arr = byDay.get(m.meal_date) ?? [];
        arr.push(m);
        byDay.set(m.meal_date, arr);
      }

      const general = extras.program?.general_observations?.trim();
      const out: ReportSection[] = [];

      if (general) {
        out.push({
          id: "geral",
          title: "OBSERVAÇÕES GERAIS",
          blocks: [{ heading: null, lines: [general] }],
        });
      }

      for (const [day, list] of byDay.entries()) {
        const note = dayNotes.get(day)?.trim();
        const blocks = list.map((m) => ({
          heading: `${MEAL_LABEL[m.type]}${m.meal_time ? ` · ${m.meal_time.slice(0, 5)}` : ""}`,
          lines: [
            kv("Anfitrião(ã)", m.host_name),
            kv("Endereço", m.location),
            kv("Telefone", m.contact_phone),
            kv("Notas", m.notes),
          ].filter((x): x is string => !!x),
        }));
        if (note) {
          blocks.unshift({ heading: "Observações do dia", lines: [note] });
        }
        out.push({
          id: `day-${day}`,
          title: fmtDay(day).toUpperCase(),
          blocks,
        });
      }

      setSections(out);
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
      tabLabel="Refeições"
      tabSlug="refeicoes"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
