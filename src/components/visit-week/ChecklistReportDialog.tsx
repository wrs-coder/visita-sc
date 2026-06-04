// Diálogo "Relatório executivo" da aba Checklist.
// Duas seções: pendentes e concluídos.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";
import { kv } from "./pdf-utils";

interface Row {
  id: string;
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

export function ChecklistReportDialog({ open, onOpenChange, visitId, visitTitle, congregationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open || !visitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("checklist_items")
        .select("id,title,description,info_text,link_or_notes,status,sort_order")
        .eq("visit_id", visitId)
        .order("sort_order")
        .order("created_at");
      if (cancelled) return;

      const rows = (data ?? []) as Row[];
      const toBlock = (r: Row) => ({
        heading: `${r.status === "done" ? "✓" : "○"} ${r.title}`,
        lines: [
          kv("Descrição", r.description),
          kv("Informações", r.info_text),
          kv("Link/Notas", r.link_or_notes),
        ].filter((x): x is string => !!x),
      });

      setSections([
        {
          id: "pending",
          title: "ITENS PENDENTES",
          blocks: rows.filter((r) => r.status !== "done").map(toBlock),
          emptyMessage: "— Nenhum item pendente —",
        },
        {
          id: "done",
          title: "ITENS CONCLUÍDOS",
          blocks: rows.filter((r) => r.status === "done").map(toBlock),
          emptyMessage: "— Nenhum item concluído —",
        },
      ]);
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
      tabLabel="Checklist"
      tabSlug="checklist"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
