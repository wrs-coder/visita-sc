// Geração de backup PDF (lado servidor) de um modelo no momento da
// alteração. Sustentável: 1 PDF por mudança, reaproveitado em todas as
// pendências de visitas afetadas; armazenado em bucket privado;
// limpado por pg_cron junto com as pendências.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CHILD_TABLES: Record<string, string[]> = {
  field_meeting_templates: ["field_meeting_template_items"],
  meeting_talk_templates: [
    "meeting_talk_template_elders",
    "meeting_talk_template_midweek",
    "meeting_talk_template_pioneer",
    "meeting_talk_template_weekend_themes",
  ],
  checklist_templates: ["checklist_template_items"],
  elder_program_templates: [
    "elder_program_template_sections",
    "elder_program_template_events",
    "elder_program_template_slots",
  ],
};

interface SnapshotShape {
  generated_at: string;
  template_type: string;
  template_id: string;
  template: Record<string, unknown> | null;
  children: Record<string, unknown[]>;
}

async function buildSnapshot(
  table: string,
  templateId: string,
  templateType: string,
): Promise<SnapshotShape> {
  const adminAny = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (
          c: string,
          v: unknown,
        ) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
          order?: (c: string) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
      };
    };
  };

  const { data: tpl } = await adminAny.from(table).select("*").eq("id", templateId).maybeSingle();

  const children: Record<string, unknown[]> = {};
  for (const child of CHILD_TABLES[table] ?? []) {
    const { data } = (await (adminAny.from(child).select("*").eq("template_id", templateId) as unknown as Promise<{
      data: Record<string, unknown>[] | null;
    }>));
    children[child] = data ?? [];
  }

  return {
    generated_at: new Date().toISOString(),
    template_type: templateType,
    template_id: templateId,
    template: tpl ?? null,
    children,
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.length <= maxChars) {
      out.push(rawLine);
      continue;
    }
    let line = rawLine;
    while (line.length > maxChars) {
      out.push(line.slice(0, maxChars));
      line = line.slice(maxChars);
    }
    if (line.length) out.push(line);
  }
  return out;
}

async function renderPdf(snapshot: SnapshotShape, title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 40;
  const lineHeight = 11;
  const maxChars = 95;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawLine = (text: string, opts: { bold?: boolean; size?: number } = {}) => {
    const size = opts.size ?? 8;
    const f = opts.bold ? fontBold : font;
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(text, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  };

  drawLine(title, { bold: true, size: 14 });
  y -= 4;
  drawLine(`Gerado em: ${snapshot.generated_at}`, { size: 9 });
  drawLine(`Tipo: ${snapshot.template_type}`, { size: 9 });
  drawLine(`ID: ${snapshot.template_id}`, { size: 9 });
  y -= 6;
  drawLine("Conteúdo (snapshot JSON):", { bold: true, size: 10 });
  y -= 2;

  const json = JSON.stringify({ template: snapshot.template, children: snapshot.children }, null, 2);
  // Sanitiza caracteres não-WinAnsi (Helvetica padrão não suporta unicode além de WinAnsi).
  const safe = json.replace(/[^\x09\x0A\x20-\x7E\u00A0-\u00FF]/g, "?");
  for (const line of wrapText(safe, maxChars)) drawLine(line);

  return await pdf.save();
}

/**
 * Gera o PDF de backup do modelo e faz upload no bucket privado
 * `visit-backups`. Retorna o path do arquivo, ou null se falhar.
 * Caminho: `{congregation_id}/{template_type}/{template_id}-{timestamp}.pdf`.
 */
export async function generateTemplateBackupPdf(opts: {
  table: string;
  templateType: string;
  templateId: string;
  congregationId: string;
  templateName: string | null;
}): Promise<string | null> {
  try {
    const snapshot = await buildSnapshot(opts.table, opts.templateId, opts.templateType);
    const title = `Backup de modelo · ${opts.templateName ?? opts.templateType}`;
    const bytes = await renderPdf(snapshot, title);

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${opts.congregationId}/${opts.templateType}/${opts.templateId}-${ts}.pdf`;

    const { error } = await supabaseAdmin.storage
      .from("visit-backups")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[template-backup] upload failed:", error.message);
      return null;
    }
    return path;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[template-backup] generation failed:", err);
    return null;
  }
}
