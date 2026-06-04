// Helpers compartilhados para geração de PDFs "Relatório executivo" nas
// abas da seção Semana da Visita. O layout segue o padrão já validado em
// `ElderExecutiveReportDialog` (A4 retrato, Helvetica, barra azul-claro
// por seção, numeração de páginas no rodapé).
//
// Nada aqui depende de React; tudo é puro para que cada aba apenas monte
// suas seções (texto plano por linha) e chame `generateVisitWeekPdf`.

import type jsPDF from "jspdf";

export interface ReportSection {
  id: string;
  title: string;
  /**
   * Texto livre de "Informações adicionais do superintendente" para esta seção.
   * Renderizado quando `includeAdditionalInfo` está marcado no diálogo.
   */
  additionalInfo?: string | null;
  /**
   * Lista de blocos/itens. Cada bloco vira um "card" numerado no PDF.
   * Use `heading` para um título destacado opcional (ex.: dia da semana,
   * nome do dia, "Reunião do meio de semana"). `lines` é uma lista de
   * pares "Rótulo: Valor" já formatados.
   */
  blocks: Array<{ heading?: string | null; lines: string[] }>;
  /** Mensagem opcional quando não há blocos para renderizar. */
  emptyMessage?: string;
}

export interface VisitWeekPdfInput {
  /** Título visual exibido no cabeçalho ("Relatório executivo — <Aba>"). */
  reportTitle: string;
  /** "Semana da visita: ..." */
  visitTitle: string;
  /** Subtítulo opcional (ex.: nome da congregação). */
  subtitle?: string;
  /** Seções a renderizar (já filtradas pelas seleções do utilizador). */
  sections: ReportSection[];
  /** Marca para incluir os textos `additionalInfo` em cada seção. */
  includeAdditionalInfo: boolean;
}

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "relatorio"
  );
}

export async function generateVisitWeekPdf(
  input: VisitWeekPdfInput,
): Promise<Blob> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const pdf: jsPDF = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
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
    opts?: { bold?: boolean; color?: [number, number, number]; indent?: number },
  ) => {
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const [r, g, b] = opts?.color ?? [20, 20, 20];
    pdf.setTextColor(r, g, b);
    const indent = opts?.indent ?? 0;
    const wrapWidth = maxW - indent;
    const lines = pdf.splitTextToSize(text, wrapWidth) as string[];
    const lh = size * 0.45;
    for (const ln of lines) {
      ensure(lh);
      pdf.text(ln, margin + indent, y + lh - 1);
      y += lh;
    }
  };

  // Cabeçalho
  writeText(input.reportTitle, 14, { bold: true, color: [30, 30, 30] });
  writeText(`Semana da visita: ${input.visitTitle}`, 10, { color: [90, 90, 90] });
  if (input.subtitle) {
    writeText(input.subtitle, 10, { color: [110, 110, 110] });
  }
  writeText(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    9,
    { color: [120, 120, 120] },
  );
  y += 3;

  for (const section of input.sections) {
    y += 3;
    ensure(10);
    pdf.setFillColor(235, 240, 250);
    pdf.rect(margin, y, maxW, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 50, 100);
    pdf.text(section.title, margin + 2, y + 5);
    y += 9;

    if (input.includeAdditionalInfo && section.additionalInfo && section.additionalInfo.trim()) {
      writeText("Informações adicionais do superintendente:", 9, { bold: true, color: [60, 60, 60] });
      writeText(section.additionalInfo.trim(), 9);
      y += 1;
    }

    if (!section.blocks.length) {
      writeText(section.emptyMessage ?? "— Sem registros —", 9, { color: [140, 140, 140] });
      continue;
    }

    section.blocks.forEach((block, idx) => {
      y += 2;
      ensure(6);
      const headLine = block.heading ? `${idx + 1}. ${block.heading}` : `${idx + 1}.`;
      writeText(headLine, 9, { bold: true, color: [30, 50, 100] });
      for (const ln of block.lines) {
        if (!ln) continue;
        writeText(ln, 9, { indent: 4 });
      }
    });
  }

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`${i} / ${total}`, pageW - margin, pageH - 5, { align: "right" });
  }

  return pdf.output("blob");
}

/** Helper para criar uma linha "Rótulo: Valor" só quando o valor existe. */
export function kv(label: string, value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v) return null;
  return `${label}: ${v}`;
}
