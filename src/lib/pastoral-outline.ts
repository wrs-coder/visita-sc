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

/** Linha resumo das informações recolhidas: "16/11/2026 · João · 3 pessoas". */
export function pastoralFieldsSummary(
  { date, companion, involved }: { date?: string | null; companion?: string | null; involved?: string | null },
  people: (n: number) => string = (n) => `${n} pessoas`,
): string {
  const parts: string[] = [];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date ?? "").trim());
  if (m) parts.push(`${m[3]}/${m[2]}/${m[1]}`);
  if (companion?.trim()) parts.push(companion.trim());
  const names = (involved ?? "").split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
  if (names.length === 1) parts.push(names[0]);
  else if (names.length > 1) parts.push(people(names.length));
  return parts.join(" · ");
}
