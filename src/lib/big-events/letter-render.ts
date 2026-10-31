// Monta a carta convite em Word (HTML → docx existente) e em PDF (pdf-lib) com link ativo.
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LetterModel } from "./letter-template";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function letterHtml(m: LetterModel): string {
  const t = m.tpl;
  const p = (s: string, b = false) => (s.trim() ? `<p>${b ? "<b>" : ""}${esc(s)}${b ? "</b>" : ""}</p>` : "");
  return [
    `<h1>${esc(t.headerTitle)}</h1>`, p(t.headerSubtitle, true), p(t.headerAddress), p(t.headerPhone),
    p(m.date), p(m.recipientName, true), p(m.recipientCong, true), p(`Ref:. ${t.refLine}`), p(t.salutation), p(t.opening),
    ...m.box.map((l) => p(l, true)),
    p(`Para aceitar/recusar a designação: ${m.linkUrl}`, true),
    m.pinLine ? p(m.pinLine, true) : "",
    p(t.remindersTitle, true), p(t.highlight, true),
    ...t.reminders.split("\n").map((l) => p(l)),
    p(t.rehearsal), p(t.rehearsalNote), p(t.closing), p(t.signoff), p(t.signature, true),
  ].join("");
}

// Fontes padrão do PDF usam WinAnsi: troca o que não cabe nele.
export function winAnsi(s: string): string {
  return s.replace(/[\u2010-\u2012]/g, "-").replace(/\u00A0/g, " ")
    .replace(/[^\u0009\u000A\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of winAnsi(text).split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(tryLine, size) <= width) line = tryLine;
      else { if (line) out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export async function letterPdf(m: LetterModel): Promise<Uint8Array> {
  const t = m.tpl;
  const doc = await PDFDocument.create();
  doc.setTitle(`Convite — ${m.recipientName}`);
  const [reg, bold, ital, sig] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique), doc.embedFont(StandardFonts.TimesRomanBoldItalic),
  ]);
  const W = 595, H = 842, M = 50, CW = W - M * 2;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const ensure = (h: number) => { if (y - h < M) { page = doc.addPage([W, H]); y = H - M; } };
  const text = (s: string, o: { font?: PDFFont; size?: number; align?: "left" | "center" | "right"; indent?: number; gap?: number; width?: number } = {}) => {
    const font = o.font ?? reg, size = o.size ?? 10, indent = o.indent ?? 0, width = (o.width ?? CW) - indent;
    for (const ln of wrap(s, font, size, width)) {
      ensure(size + 3);
      const w = font.widthOfTextAtSize(ln, size);
      const x = o.align === "center" ? M + (CW - w) / 2 : o.align === "right" ? M + CW - w : M + indent;
      page.drawText(ln, { x, y: y - size, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 3;
    }
    y -= o.gap ?? 0;
  };

  // Timbre
  text(t.headerTitle, { font: bold, size: 22, align: "center" });
  if (t.headerSubtitle) text(t.headerSubtitle, { font: bold, size: 15, align: "center" });
  if (t.headerAddress) text(t.headerAddress, { size: 8, align: "center" });
  if (t.headerPhone) text(t.headerPhone, { size: 8, align: "center" });
  y -= 4; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) }); y -= 12;

  text(m.date, { align: "center", size: 9, gap: 10 });
  if (m.recipientName) text(m.recipientName, { font: ital, size: 10 });
  if (m.recipientCong) text(m.recipientCong, { font: ital, size: 10, gap: 8 });
  if (t.refLine) text(`Ref:. ${t.refLine}`, { size: 9.5, gap: 8 });
  if (t.salutation) text(t.salutation, { size: 10, gap: 2 });
  if (t.opening) text(t.opening, { size: 10, indent: 0, gap: 12 });

  // Quadro da designação (automático)
  const lines = m.box.flatMap((l) => wrap(l, bold, 9.5, CW - 20));
  const linkLabel = "Para aceitar/recusar a designação: ";
  const boxH = (lines.length + 1 + (m.pinLine ? wrap(m.pinLine, bold, 9.5, CW - 20).length : 0)) * 12.5 + 16;
  ensure(boxH);
  const top = y;
  page.drawRectangle({ x: M, y: top - boxH, width: CW, height: boxH, borderColor: rgb(0.15, 0.15, 0.15), borderWidth: 1.2 });
  y -= 8;
  for (const ln of lines) { page.drawText(ln, { x: M + 10, y: y - 9.5, size: 9.5, font: bold }); y -= 12.5; }
  page.drawText(winAnsi(linkLabel), { x: M + 10, y: y - 9.5, size: 9.5, font: bold });
  const lx = M + 10 + bold.widthOfTextAtSize(winAnsi(linkLabel), 9.5);
  const label = "Clique aqui!", lw = bold.widthOfTextAtSize(label, 10) + 14;
  page.drawRectangle({ x: lx, y: y - 12, width: lw, height: 14, color: rgb(0.27, 0.53, 0.89) });
  page.drawText(label, { x: lx + 7, y: y - 9.5, size: 10, font: bold, color: rgb(1, 1, 1) });
  const annot = doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [lx, y - 12, lx + lw, y + 2], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(m.linkUrl) },
  }));
  page.node.set(PDFName.of("Annots"), doc.context.obj([annot]));
  y -= 12.5;
  if (m.pinLine) for (const ln of wrap(m.pinLine, bold, 9.5, CW - 20)) { page.drawText(ln, { x: M + 10, y: y - 9.5, size: 9.5, font: bold }); y -= 12.5; }
  y = top - boxH - 14;

  // Lembretes
  if (t.remindersTitle) text(t.remindersTitle, { font: bold, size: 10.5, align: "center", gap: 4 });
  const band = (s: string, color: [number, number, number], font: PDFFont) => {
    if (!s.trim()) return;
    const ls = s.split("\n").flatMap((p) => wrap(p, font, 9.5, CW - 16));
    const h = ls.length * 12.5 + 8;
    ensure(h);
    page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: rgb(...color) });
    y -= 4;
    for (const ln of ls) { page.drawText(ln, { x: M + 8, y: y - 9.5, size: 9.5, font }); y -= 12.5; }
    y -= 10;
  };
  band(t.highlight, [0.9, 0.9, 0.9], bold);
  band(t.reminders, [0.88, 0.95, 0.86], reg);
  if (t.rehearsal) text(`• ${t.rehearsal}`, { size: 9.5 });
  if (t.rehearsalNote) text(t.rehearsalNote, { font: ital, size: 9, indent: 18, gap: 8 });
  if (t.closing) text(t.closing, { size: 10, gap: 4 });
  if (t.signoff) text(t.signoff, { size: 10, align: "center", gap: 2 });
  if (t.signature) text(t.signature, { font: sig, size: 12, align: "right" });
  return doc.save();
}
