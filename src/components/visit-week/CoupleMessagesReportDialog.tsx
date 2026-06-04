// Diálogo "Relatório executivo" da aba Comunicação Casal.
// Cada thread vira um bloco com a mensagem raiz + respostas concatenadas.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listCoupleMessages, type CoupleThread } from "@/lib/couple-messages.functions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VisitWeekReportDialog } from "./VisitWeekReportDialog";
import type { ReportSection } from "./pdf-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitTitle: string;
  congregationName?: string;
}

const fmt = (iso: string) => {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

export function CoupleMessagesReportDialog({ open, onOpenChange, visitTitle, congregationName }: Props) {
  const listFn = useServerFn(listCoupleMessages);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await listFn();
        if (cancelled) return;
        if (!r.ok) {
          setSections([]);
          setLoading(false);
          return;
        }
        const threads: CoupleThread[] = r.threads;
        const blocks = threads.map((th) => {
          const lines: string[] = [];
          const author = th.root.author === "wife" ? "Esposa" : "Superintendente";
          lines.push(`De: ${author} em ${fmt(th.root.created_at)}`);
          if (th.root.body) lines.push(`Mensagem: ${th.root.body}`);
          for (const rep of th.replies) {
            const ra = rep.author === "wife" ? "Esposa" : "Superintendente";
            lines.push(`↳ Resposta de ${ra} em ${fmt(rep.created_at)}: ${rep.body}`);
          }
          return { heading: th.root.title || "(sem título)", lines };
        });

        setSections([
          {
            id: "messages",
            title: "MENSAGENS ENTRE O CASAL",
            blocks,
            emptyMessage: "— Nenhuma mensagem registrada —",
          },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listFn]);

  return (
    <VisitWeekReportDialog
      open={open}
      onOpenChange={onOpenChange}
      tabLabel="Comunicação do Casal"
      tabSlug="comunicacao-casal"
      visitTitle={visitTitle}
      subtitle={congregationName}
      sections={sections}
      loading={loading}
    />
  );
}
