import type { NoteAttachment } from "@/lib/outline-attachments";

/** Lê o esboço do pastoreio guardado no payload da nota (notas antigas → vazio). */
export function readPastoralOutline(payload: Record<string, unknown> | null | undefined): { html: string; attachments: NoteAttachment[] } {
  const p = payload ?? {};
  const html = typeof p.outline_html === "string" ? p.outline_html : "";
  const attachments = Array.isArray(p.attachments) ? (p.attachments as NoteAttachment[]) : [];
  return { html, attachments };
}

/** Texto simples do esboço (exportar PDF/WhatsApp). */
export function pastoralOutlineText(payload: Record<string, unknown> | null | undefined): string {
  const { html } = readPastoralOutline(payload);
  return html
    .replace(/<\/(p|li|h[1-6]|div|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
