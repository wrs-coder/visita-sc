import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { saveBlob } from "@/lib/share";
import type { ElderVisitEventDTO } from "@/lib/elder-program.functions";

type Section = "pastoral" | "encouragement" | "recommendations" | "local";

const SECTION_TITLES: Record<Section, string> = {
  pastoral: "VISITAS DE PASTOREIO",
  encouragement: "ENCORAJAMENTO — INATIVOS, DOENTES, PRIVILÉGIOS ESPECIAIS",
  recommendations: "RECOMENDAÇÕES PARA ANCIÃOS E SERVOS MINISTERIAIS/CANCELAMENTOS",
  local: "ASSUNTOS LOCAIS DEFINIDOS PELO CORPO DE ANCIÃOS",
};

const CAT_LABEL: Record<string, string> = {
  inactive: "Inativo",
  sick: "Doente",
  special_privileges: "Privilégios Especiais",
};
const PURPOSE_LABEL: Record<string, string> = {
  ministerial_servant: "Servo Ministerial",
  elder: "Ancião",
  redesignation: "Redesignação",
  removal: "Remoção",
  cca_change: "Mudança de CCA",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitTitle: string;
  sections: Record<Section, string>;
  pastoral: ElderVisitEventDTO[];
  encouragement: ElderVisitEventDTO[];
  recommendations: ElderVisitEventDTO[];
  local: ElderVisitEventDTO[];
}

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "relatorio";
}

export function ElderExecutiveReportDialog({
  open, onOpenChange, visitTitle, sections, pastoral, encouragement, recommendations, local,
}: Props) {
  const [includeInfo, setIncludeInfo] = useState(true);
  const [sel, setSel] = useState<Record<Section, boolean>>({
    pastoral: true, encouragement: true, recommendations: true, local: true,
  });
  const [busy, setBusy] = useState(false);

  const toggle = (s: Section) => setSel((p) => ({ ...p, [s]: !p[s] }));

  const eventsOf = (s: Section): ElderVisitEventDTO[] =>
    s === "pastoral" ? pastoral
    : s === "encouragement" ? encouragement
    : s === "recommendations" ? recommendations
    : local;

  function renderEventLines(ev: ElderVisitEventDTO): string[] {
    const out: string[] = [];
    const add = (label: string, val?: string | null) => {
      if (val && val.trim()) out.push(`${label}: ${val.trim()}`);
    };
    if (ev.section === "pastoral") {
      add("Dia/Horário", ev.slot_label);
      add("Acompanhante", ev.companion);
      add("Família/Irmão(ã)", ev.family_name);
      add("Endereço", ev.address);
      add("Membros da Família", ev.family_members);
      add("Informações Espirituais/Pessoais", ev.spiritual_info);
    } else if (ev.section === "encouragement") {
      add("Categoria", ev.category ? CAT_LABEL[ev.category] : null);
      add("Nome", ev.person_name);
      add("Endereço", ev.address);
      add("Contato", ev.contact);
      if (ev.category === "sick") add("Problemas de Saúde", ev.health_info);
      add("Informações Espirituais/Pessoais", ev.spiritual_info);
    } else if (ev.section === "recommendations") {
      add("Recomendação para", ev.purpose ? PURPOSE_LABEL[ev.purpose] : null);
      add("Nome Completo", ev.full_name);
      add("Membros da Família", ev.family_members);
      add("Grupo de campo", ev.field_group);
      add("Informações", ev.info);
    } else {
      add("Quem indicou", ev.suggested_by);
      add("Tema", ev.subject);
      add("Fontes pesquisadas", ev.sources);
      add("Informações", ev.info);
    }
    return out;
  }

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const { createJsPdfCompat } = await import("@/lib/pdf/pdf-engine");
      const pdf = await createJsPdfCompat({ orientation: "p", unit: "mm" });
      const pageW = pdf.pageW;
      const pageH = pdf.pageH;
      const margin = 12;
      const maxW = pageW - margin * 2;
      let y = margin;

      const ensure = (h: number) => {
        if (y + h > pageH - margin) {
          pdf.addPage();
          y = margin;
        }
      };
      const writeText = (
        text: string,
        size: number,
        opts?: { bold?: boolean; color?: [number, number, number] },
      ) => {
        pdf.setFont(opts?.bold ?? false);
        pdf.setFontSize(size);
        const [r, g, b] = opts?.color ?? [20, 20, 20];
        pdf.setTextColor(r, g, b);
        const lines = pdf.splitTextToSize(text, maxW);
        const lh = size * 0.45;
        for (const ln of lines) {
          ensure(lh);
          pdf.text(ln, margin, y + lh - 1);
          y += lh;
        }
      };

      // Header
      writeText("Relatório Executivo — Pastoreios, Recomendações e outros", 14, { bold: true, color: [30, 30, 30] });
      writeText(`Semana da visita: ${visitTitle}`, 10, { color: [90, 90, 90] });
      writeText(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 9, { color: [120, 120, 120] });
      y += 3;

      const sectionsList: Section[] = ["pastoral", "encouragement", "recommendations", "local"];
      for (const s of sectionsList) {
        if (!sel[s]) continue;
        y += 3;
        ensure(10);
        // section title bar
        pdf.setFillColor(235, 240, 250);
        pdf.rect(margin, y, maxW, 7, "F");
        pdf.setFont(true);
        pdf.setFontSize(10);
        pdf.setTextColor(30, 50, 100);
        pdf.text(SECTION_TITLES[s], margin + 2, y + 5);
        y += 9;

        if (includeInfo && sections[s] && sections[s].trim()) {
          writeText("Informações adicionais do superintendente:", 9, { bold: true, color: [60, 60, 60] });
          writeText(sections[s].trim(), 9);
          y += 1;
        }

        const evs = eventsOf(s);
        if (!evs.length) {
          writeText("— Sem eventos —", 9, { color: [140, 140, 140] });
          continue;
        }

        evs.forEach((ev, idx) => {
          const lines = renderEventLines(ev);
          if (!lines.length) return;
          y += 2;
          ensure(6);
          writeText(`${idx + 1}.`, 9, { bold: true, color: [30, 50, 100] });
          for (const ln of lines) writeText(`   ${ln}`, 9);
        });
      }

      // page numbers
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFont(false);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${i} / ${total}`, pageW - margin, pageH - 5, { align: "right" });
      }

      const blob = await pdf.output("blob");
      const filename = `relatorio-executivo-ancioes-${slugify(visitTitle)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await saveBlob(blob, {
        filename,
        mimeType: "application/pdf",
        pickerTypes: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
      toast.success("Relatório gerado");
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao gerar PDF", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" /> Relatório executivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Selecione as seções que deseja incluir no PDF.</p>
          <div className="space-y-2">
            {(["pastoral", "encouragement", "recommendations", "local"] as Section[]).map((s) => (
              <label key={s} className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={sel[s]} onCheckedChange={() => toggle(s)} />
                <span className="text-sm leading-tight">{SECTION_TITLES[s]}</span>
              </label>
            ))}
            <label className="flex items-start gap-2 cursor-pointer pt-2 border-t mt-2">
              <Checkbox checked={includeInfo} onCheckedChange={(v) => setIncludeInfo(!!v)} />
              <span className="text-sm leading-tight">Incluir “Informações adicionais do superintendente” em cada seção</span>
            </label>
          </div>
          <Label className="text-xs text-muted-foreground block pt-2">
            Onde permitido, o navegador abrirá o seletor de pasta para você escolher onde salvar o PDF.
          </Label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={busy || !Object.values(sel).some(Boolean)}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
