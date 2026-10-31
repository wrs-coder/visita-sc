// Monta a carta convite em Word (HTML → docx existente) e em PDF (pdf-lib) com link ativo.
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { LetterModel } from "./letter-template";
import type { InviteEvent, InvitePart } from "./invite";
import { formatEventDate } from "./invite";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Word: lista de conferência, uma designação por bloco (sem timbre, lembretes ou assinatura). */
export function assignmentsListHtml(ev: InviteEvent, items: { part: InvitePart; model: LetterModel }[]): string {
  const p = (s: string, b = false) => (s.trim() ? `<p>${b ? "<b>" : ""}${esc(s)}${b ? "</b>" : ""}</p>` : "");
  const sorted = [...items].sort((x, y) => (x.part.part_time ?? "99").localeCompare(y.part.part_time ?? "99") || x.part.sort_order - y.part.sort_order);
  const head = [
    `<h1>${esc(ev.name)}</h1>`,
    p([ev.event_date ? formatEventDate(ev.event_date) : "", ev.location ?? ""].filter(Boolean).join(" · ")),
    p(`${sorted.length} ${sorted.length === 1 ? "designação" : "designações"}`),
  ];
  const blocks = sorted.map(({ model: m }) => [
    "<hr>",
    ...m.box.slice(1).map((l, i) => p(l, i === 0 || l.startsWith("Sua designação"))),
    p(`Link: ${m.linkUrl}`),
    m.pinLine ? p(m.pinLine) : "",
  ].join(""));
  return [...head, ...blocks].join("");
}

// Fontes padrão do PDF usam WinAnsi: troca o que não cabe nele.
export function winAnsi(s: string): string {
  return s.replace(/[\u2010-\u2012]/g, "-").replace(/\u00A0/g, " ")
    .replace(/[^\u0009\u000A\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, "");
}

export interface LetterFontBytes { serif: ArrayBuffer | Uint8Array; serifBold: ArrayBuffer | Uint8Array; serifItalic: ArrayBuffer | Uint8Array; sans: ArrayBuffer | Uint8Array; sansBold: ArrayBuffer | Uint8Array; sansItalic: ArrayBuffer | Uint8Array }

const FONT_FILES: Record<keyof LetterFontBytes, string> = {
  serif: "Lora-Regular.ttf", serifBold: "Lora-Bold.ttf", serifItalic: "Lora-Italic.ttf",
  sans: "Lato-Regular.ttf", sansBold: "Lato-Bold.ttf", sansItalic: "Lato-Italic.ttf",
};
let fontCache: Promise<LetterFontBytes | null> | null = null;
/** Fontes da carta (Lora + Lato, OFL) servidas pelo próprio app: funcionam offline. */
export function loadLetterFonts(): Promise<LetterFontBytes | null> {
  if (!fontCache) {
    fontCache = (async () => {
      try {
        const entries = await Promise.all(Object.entries(FONT_FILES).map(async ([k, f]) => {
          const r = await fetch(`/fonts/letter/${f}`);
          if (!r.ok) throw new Error(f);
          return [k, await r.arrayBuffer()] as const;
        }));
        return Object.fromEntries(entries) as unknown as LetterFontBytes;
      } catch { fontCache = null; return null; }
    })();
  }
  return fontCache;
}

const INK = rgb(0.15, 0.16, 0.19), MUTED = rgb(0.42, 0.44, 0.48), ACCENT = rgb(0.1, 0.31, 0.38), GOLD = rgb(0.72, 0.6, 0.38);
const WARM = rgb(0.988, 0.976, 0.953), TINT_GOLD = rgb(0.985, 0.965, 0.93), TINT_ACCENT = rgb(0.94, 0.965, 0.965), WHITE = rgb(1, 1, 1);

interface WLine { text: string; last: boolean }
function wrapP(text: string, font: PDFFont, size: number, width: number, clean: (s: string) => string): WLine[] {
  const out: WLine[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    const words = para.split(/\s+/).filter(Boolean);
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= width) line = t;
      else { if (line) out.push({ text: line, last: false }); line = w; }
    }
    out.push({ text: line, last: true });
  }
  return out;
}

const roundRect = (w: number, h: number, r: number) =>
  `M ${r},0 H ${w - r} Q ${w},0 ${w},${r} V ${h - r} Q ${w},${h} ${w - r},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`;

/**
 * Carta em PDF: papel branco, margens amplas, Lora nos títulos, Lato no corpo,
 * texto justificado (listas à esquerda), data à direita, link "Clique aqui!" ativo.
 */
export async function letterPdf(m: LetterModel, fontBytes?: LetterFontBytes | null): Promise<Uint8Array> {
  const t = m.tpl;
  const doc = await PDFDocument.create();
  doc.setTitle(`Convite — ${m.recipientName}`);
  const bytes = fontBytes === undefined ? await loadLetterFonts() : fontBytes;
  let F: { serif: PDFFont; serifBold: PDFFont; serifItalic: PDFFont; sans: PDFFont; sansBold: PDFFont; sansItalic: PDFFont };
  let clean: (s: string) => string;
  if (bytes) {
    doc.registerFontkit(fontkit);
    const e = (b: ArrayBuffer | Uint8Array) => doc.embedFont(b, { subset: true });
    const [serif, serifBold, serifItalic, sans, sansBold, sansItalic] = await Promise.all([e(bytes.serif), e(bytes.serifBold), e(bytes.serifItalic), e(bytes.sans), e(bytes.sansBold), e(bytes.sansItalic)]);
    F = { serif, serifBold, serifItalic, sans, sansBold, sansItalic };
    clean = (s) => s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
  } else {
    const [serif, serifBold, serifItalic, sans, sansBold, sansItalic] = await Promise.all([
      StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic,
      StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique].map((f) => doc.embedFont(f)));
    F = { serif, serifBold, serifItalic, sans, sansBold, sansItalic };
    clean = winAnsi;
  }

  const W = 595, H = 842, M = 68, CW = W - M * 2;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - 60;
  const annots: unknown[] = [];
  const ensure = (h: number) => { if (y - h < 56) { page = doc.addPage([W, H]); y = H - 60; } };
  type TO = { font?: PDFFont; size?: number; align?: "left" | "center" | "right" | "justify"; x?: number; width?: number; gap?: number; color?: RGB; lead?: number };
  const text = (s: string, o: TO = {}) => {
    if (!s.trim()) return;
    const font = o.font ?? F.sans, size = o.size ?? 10.5, x0 = o.x ?? M, width = o.width ?? CW, lead = o.lead ?? size * 1.5;
    for (const ln of wrapP(s, font, size, width, clean)) {
      ensure(lead);
      const base = y - size;
      if (o.align === "justify" && !ln.last && ln.text.includes(" ")) {
        const words = ln.text.split(" ");
        const wsum = words.reduce((a, w) => a + font.widthOfTextAtSize(w, size), 0);
        const gapW = (width - wsum) / (words.length - 1);
        let x = x0;
        for (const w of words) { page.drawText(w, { x, y: base, size, font, color: o.color ?? INK }); x += font.widthOfTextAtSize(w, size) + gapW; }
      } else {
        const w = font.widthOfTextAtSize(ln.text, size);
        const x = o.align === "center" ? x0 + (width - w) / 2 : o.align === "right" ? x0 + width - w : x0;
        page.drawText(ln.text, { x, y: base, size, font, color: o.color ?? INK });
      }
      y -= lead;
    }
    y -= o.gap ?? 0;
  };
  const rule = (color: RGB, x1 = M, x2 = W - M, th = 0.6) => page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: th, color });

  // Timbre
  text(t.headerTitle, { font: F.serifBold, size: 22, align: "center", lead: 28, color: ACCENT });
  text(t.headerSubtitle, { font: F.serif, size: 12, align: "center", lead: 17, color: INK });
  text(t.headerAddress, { size: 8.5, align: "center", lead: 12, color: MUTED });
  text(t.headerPhone, { size: 8.5, align: "center", lead: 12, color: MUTED });
  y -= 8; rule(GOLD, M + CW * 0.2, W - M - CW * 0.2, 0.8); y -= 22;

  text(m.date, { size: 10, align: "right", color: MUTED, gap: 14 });
  text(m.recipientName, { font: F.serifBold, size: 11.5, lead: 16 });
  text(m.recipientCong, { size: 10, color: MUTED, gap: 12 });
  if (t.refLine.trim()) {
    ensure(18);
    const lab = "Ref.: ";
    page.drawText(lab, { x: M, y: y - 10.5, size: 10.5, font: F.serifBold, color: ACCENT });
    const lw = F.serifBold.widthOfTextAtSize(lab, 10.5);
    text(t.refLine, { font: F.sansBold, size: 10, x: M + lw, width: CW - lw, gap: 12 });
  }
  text(t.salutation, { font: F.serifItalic, size: 11.5, gap: 6 });
  text(t.opening, { align: "justify", gap: 16 });

  // Quadro da designação (automático)
  const PADX = 16, LABW = 96, VALW = CW - PADX * 2 - LABW;
  type Row = { label: string; lines: WLine[] };
  const [titleLine, ...rest] = m.box;
  const titleLines = wrapP(titleLine ?? "", F.serifBold, 12, CW - PADX * 2, clean);
  const rows: Row[] = rest.map((l) => {
    const k = l.indexOf(": ");
    const label = k > 0 && k < 26 ? l.slice(0, k) : "";
    const val = label ? l.slice(k + 2) : l;
    return { label: label.toUpperCase(), lines: wrapP(val, F.sansBold, 10, label ? VALW : CW - PADX * 2, clean) };
  });
  const pinLines = m.pinLine ? wrapP(m.pinLine, F.sans, 9, CW - PADX * 2, clean) : [];
  const RL = 14.5;
  const boxH = 16 + titleLines.length * 17 + 8 + rows.reduce((a, r) => a + r.lines.length * RL + 4, 0) + 12 + 24 + 10 + pinLines.length * 13 + 12;
  ensure(boxH);
  const top = y;
  page.drawSvgPath(roundRect(CW, boxH, 10), { x: M, y: top, color: WARM, borderColor: GOLD, borderWidth: 0.8 });
  y -= 16;
  for (const l of titleLines) { page.drawText(l.text, { x: M + PADX, y: y - 12, size: 12, font: F.serifBold, color: ACCENT }); y -= 17; }
  y -= 2; rule(GOLD, M + PADX, W - M - PADX, 0.4); y -= 8;
  for (const r of rows) {
    if (r.label) page.drawText(clean(r.label), { x: M + PADX, y: y - 9.5, size: 7.5, font: F.sansBold, color: MUTED });
    const vx = r.label ? M + PADX + LABW : M + PADX;
    for (const l of r.lines) { page.drawText(l.text, { x: vx, y: y - 10, size: 10, font: F.sansBold, color: INK }); y -= RL; }
    y -= 4;
  }
  y -= 12;
  const label = "Clique aqui!", bw = F.sansBold.widthOfTextAtSize(label, 11) + 40, bh = 24;
  const prompt = "Para aceitar ou recusar a designação:";
  const pw = F.sans.widthOfTextAtSize(clean(prompt), 9.5);
  const rowW = pw + 10 + bw, px = M + (CW - rowW) / 2, bx = px + pw + 10;
  page.drawText(clean(prompt), { x: px, y: y - bh / 2 - 3.5, size: 9.5, font: F.sans, color: INK });
  page.drawSvgPath(roundRect(bw, bh, bh / 2), { x: bx, y, color: ACCENT });
  page.drawText(label, { x: bx + 20, y: y - bh / 2 - 4, size: 11, font: F.sansBold, color: WHITE });
  annots.push(doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [bx, y - bh, bx + bw, y], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(m.linkUrl) },
  })));
  const linkPage = page;
  y -= bh + 10;
  for (const l of pinLines) { const w = F.sans.widthOfTextAtSize(l.text, 9); page.drawText(l.text, { x: M + (CW - w) / 2, y: y - 9, size: 9, font: F.sans, color: MUTED }); y -= 13; }
  y = top - boxH - 22;

  // Informações e lembretes
  if (t.remindersTitle.trim()) {
    text(t.remindersTitle, { font: F.serifBold, size: 11.5, color: ACCENT, lead: 15 });
    y -= 2; rule(GOLD, M, M + 40, 1); y -= 10;
  }
  const band = (s: string, fill: RGB, bar: RGB, font: PDFFont) => {
    if (!s.trim()) return;
    const ls = wrapP(s, font, 9.8, CW - 26, clean);
    const lead = 14.5, h = ls.length * lead + 16 + ls.filter((l) => l.last).length * 3;
    ensure(h);
    page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: fill });
    page.drawRectangle({ x: M, y: y - h, width: 3, height: h, color: bar });
    y -= 8;
    for (const l of ls) { page.drawText(l.text, { x: M + 16, y: y - 9.8, size: 9.8, font, color: INK }); y -= lead + (l.last ? 3 : 0); }
    y -= 8 + 12;
  };
  band(t.highlight, TINT_GOLD, GOLD, F.sansBold);
  band(t.reminders, TINT_ACCENT, ACCENT, F.sans);
  text(t.rehearsal, { font: F.sansBold, size: 10, gap: 0 });
  text(t.rehearsalNote, { font: F.sansItalic, size: 9.5, color: MUTED, gap: 14 });
  text(t.closing, { align: "justify", gap: 14 });
  text(t.signoff, { font: F.serifItalic, size: 11, gap: 6 });
  text(t.signature, { font: F.serifItalic, size: 13.5, align: "right", color: ACCENT });
  linkPage.node.set(PDFName.of("Annots"), doc.context.obj(annots as never[]));
  return doc.save({ useObjectStreams: false });
}
