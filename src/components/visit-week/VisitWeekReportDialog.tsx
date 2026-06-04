// Diálogo genérico "Relatório executivo" reutilizado em todas as abas da
// seção "Semana da Visita". Cada aba decide:
//   - quais seções existem (`sections` prop),
//   - se há texto de "Informações adicionais do superintendente",
//   - como cada seção é construída (linhas já formatadas em texto).
//
// O componente cuida apenas da UI do diálogo (checkboxes, mensagens,
// botão "Gerar PDF") e da chamada para `generateVisitWeekPdf` + `saveBlob`.

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { saveBlob } from "@/lib/share";
import { generateVisitWeekPdf, slugify, type ReportSection } from "./pdf-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome amigável da aba (ex.: "Refeições") — usado no título do PDF e no slug do arquivo. */
  tabLabel: string;
  /** Slug curto da aba (ex.: "refeicoes") — usado no nome do arquivo. */
  tabSlug: string;
  /** Título da visita (aparece no header do PDF). */
  visitTitle: string;
  /** Subtítulo opcional (ex.: nome da congregação). */
  subtitle?: string;
  /** Seções disponíveis para inclusão no PDF. */
  sections: ReportSection[];
  /** Se true, oferece o toggle "Incluir Informações adicionais do superintendente". */
  showAdditionalInfoToggle?: boolean;
  /** Loading state externo (a aba ainda está montando os dados). */
  loading?: boolean;
}

export function VisitWeekReportDialog({
  open,
  onOpenChange,
  tabLabel,
  tabSlug,
  visitTitle,
  subtitle,
  sections,
  showAdditionalInfoToggle = false,
  loading = false,
}: Props) {
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [includeInfo, setIncludeInfo] = useState(true);
  const [busy, setBusy] = useState(false);

  // Inicializa todas as seções como selecionadas sempre que a lista muda.
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const id of sectionIds) {
        next[id] = prev[id] ?? true;
      }
      return next;
    });
  }, [sectionIds]);

  const toggle = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const anySelected = Object.values(selected).some(Boolean);

  const handleGenerate = async () => {
    if (!anySelected) return;
    setBusy(true);
    try {
      const filtered = sections.filter((s) => selected[s.id]);
      const blob = await generateVisitWeekPdf({
        reportTitle: `Relatório executivo — ${tabLabel}`,
        visitTitle,
        subtitle,
        sections: filtered,
        includeAdditionalInfo: includeInfo,
      });
      const filename = `relatorio-executivo-${tabSlug}-${slugify(visitTitle)}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
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

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando dados…
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione as seções que deseja incluir no PDF.
            </p>

            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Sem seções disponíveis para esta aba.
              </p>
            ) : (
              <div className="space-y-2">
                {sections.map((s) => (
                  <label key={s.id} className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!selected[s.id]}
                      onCheckedChange={() => toggle(s.id)}
                    />
                    <span className="text-sm leading-tight">{s.title}</span>
                  </label>
                ))}

                {showAdditionalInfoToggle && (
                  <label className="flex items-start gap-2 cursor-pointer pt-2 border-t mt-2">
                    <Checkbox
                      checked={includeInfo}
                      onCheckedChange={(v) => setIncludeInfo(!!v)}
                    />
                    <span className="text-sm leading-tight">
                      Incluir “Informações adicionais do superintendente” em cada seção
                    </span>
                  </label>
                )}
              </div>
            )}

            <Label className="text-xs text-muted-foreground block pt-2">
              Onde permitido, o navegador abrirá o seletor de pasta para você escolher onde salvar o PDF.
            </Label>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={busy || loading || !anySelected || sections.length === 0}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Botão padrão "Relatório executivo" para ser reutilizado nas abas. */
export function VisitWeekReportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <FileDown className="h-4 w-4 mr-1" /> Relatório executivo
    </Button>
  );
}
