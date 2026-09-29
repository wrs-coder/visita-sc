// Diálogo "Relatório executivo" da aba Checklist.
// Duas seções: pendentes e concluídos. Cada item traz todas as respostas.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readWithMirror } from "@/lib/local-first";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kvAlways } from "./report-schedule";

interface Row {
  id: string;
  visit_id: string;
  title: string;
  description: string | null;
  info_text: string | null;
  link_or_notes: string | null;
  status: "pending" | "done";
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  visitTitle: string;
  congregationName?: string;
}

export function checklistBlock(r: {
  title?: unknown;
  status?: unknown;
  description?: unknown;
  info_text?: unknown;
  link_or_notes?: unknown;
}) {
  const done = r.status === "done";
  const str = (v: unknown) => (v == null ? null : String(v));
  return {
    heading: `${done ? "✓" : "○"} ${str(r.title) ?? ""}`.trim(),
    lines: [
      kvAlways("Situação", done ? "Concluído" : "Pendente"),
      kvAlways("Descrição", str(r.description)),
      kvAlways("Informações", str(r.info_text)),
      kvAlways("Link/Notas", str(r.link_or_notes)),
    ],
  };
}

export function ChecklistReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await readWithMirror<Row & Record<string, unknown>>({
          table: "checklist_items",
          remote: () =>
            supabase
              .from("checklist_items")
              .select("*")
              .eq("visit_id", visitId)
              .order("sort_order")
              .order("created_at") as never,
          filter: (r) => r.visit_id === visitId,
          sort: (a, b) => Number(a.sort_order) - Number(b.sort_order),
        });
        if (cancelled) return;
        const rows = res.rows as Row[];
        setSections([
          {
            id: "pending",
            title: "ITENS PENDENTES",
            blocks: rows.filter((r) => r.status !== "done").map(checklistBlock),
            emptyMessage: "— Nenhum item pendente —",
          },
          {
            id: "done",
            title: "ITENS CONCLUÍDOS",
            blocks: rows.filter((r) => r.status === "done").map(checklistBlock),
            emptyMessage: "— Nenhum item concluído —",
          },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visitId]);

  return (
    <VisitWeekReportDialog
      open={open}
      onOpenChange={onOpenChange}
      tabLabel="Checklist"
      tabSlug="checklist"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
