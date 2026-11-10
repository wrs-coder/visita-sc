// Monta a carta convite em Word (HTML → docx existente) e em PDF (pdf-lib) com link ativo.
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { headerStyleOf, resolveLetterColors, type LetterModel, type RGB3 } from "./letter-template";
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
  const blocks = sorted.map(({ model: m, part }, i) => [
    '<hr data-divider="1">',
    `<h3>Convite ${i + 1}${part.part_time ? ` · ${esc(part.part_time.slice(0, 5))}` : ""}</h3>`,
    ...m.box.slice(1).map((l, i) => p(l, i === 0 || l.startsWith("Sua designação"))),
    p(`Link: ${m.linkUrl}`),
    m.pinLine ? p(m.pinLine) : "",
  ].join(""));
  return [...head, ...blocks, sorted.length ? '<hr data-divider="1">' : ""].join("");
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
          let r = await fetch(`/fonts/letter/${f}`).catch(() => null);
          if (!r?.ok) r = await fetch(`/fonts/letter/${f}`, { cache: "reload" });
          if (!r.ok) throw new Error(f);
          return [k, await r.arrayBuffer()] as const;
        }));
        return Object.fromEntries(entries) as unknown as LetterFontBytes;
      } catch { fontCache = null; return null; }
    })();
  }
  return fontCache;
}

const INK = rgb(0.15, 0.16, 0.19), MUTED = rgb(0.42, 0.44, 0.48), WHITE = rgb(1, 1, 1);

interface WLine { text: string; last: boolean; first: boolean }
function wrapP(text: string, font: PDFFont, size: number, width: number, clean: (s: string) => string, indent = 0): WLine[] {
  const out: WLine[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "", first = true;
    const words = para.split(/\s+/).filter(Boolean);
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= width - (first ? indent : 0)) line = t;
      else { if (line) { out.push({ text: line, last: false, first }); first = false; } line = w; }
    }
    out.push({ text: line, last: true, first });
  }
  return out;
}

const roundRect = (w: number, h: number, r: number) =>
  `M ${r},0 H ${w - r} Q ${w},0 ${w},${r} V ${h - r} Q ${w},${h} ${w - r},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`;

/** Níveis de compactação para caber em 1 página: espaços, margens e, por fim, fonte (mín. 11). */
export const LETTER_FIT_LEVELS = [
  { gap: 1, side: 68, top: 60, bottom: 56, size: 11.5 },
  { gap: 0.8, side: 68, top: 50, bottom: 46, size: 11.5 },
  { gap: 0.65, side: 60, top: 42, bottom: 40, size: 11.5 },
  { gap: 0.55, side: 54, top: 36, bottom: 34, size: 11.25 },
  { gap: 0.5, side: 51, top: 32, bottom: 30, size: 11 },
  { gap: 0.3, side: 51, top: 26, bottom: 24, size: 11 },
] as const;
type FitLevel = { gap: number; side: number; top: number; bottom: number; size: number };
/** Recuo da primeira linha dos parágrafos: 1,25 cm. */
const INDENT = 35.4;

/** Carta em PDF (bytes). Veja letterPdfFit para saber se coube em 1 página. */
export async function letterPdf(m: LetterModel, fontBytes?: LetterFontBytes | null): Promise<Uint8Array> {
  return (await letterPdfFit(m, fontBytes)).bytes;
}

/** Tenta cada nível de compactação até caber em 1 página; devolve o último se não couber. */
export async function letterPdfFit(m: LetterModel, fontBytes?: LetterFontBytes | null): Promise<{ bytes: Uint8Array; pages: number }> {
  const bytes = fontBytes === undefined ? await loadLetterFonts() : fontBytes;
  let doc: PDFDocument | null = null;
  for (const lv of LETTER_FIT_LEVELS) {
    doc = await renderLetter(m, bytes, lv);
    if (doc.getPageCount() === 1) break;
  }
  return { bytes: await doc!.save({ useObjectStreams: false }), pages: doc!.getPageCount() };
}

/**
 * Carta: papel branco, Lora em todo o texto, corpo justificado com recuo de 1,25 cm,
 * itálico só na observação do ensaio e na assinatura, link "Clique aqui!" ativo.
 */
async function renderLetter(m: LetterModel, bytes: LetterFontBytes | null, lv: FitLevel): Promise<PDFDocument> {
  const t = m.tpl;
  const pal = resolveLetterColors(t.colors);
  const C = (c: RGB3) => rgb(c[0], c[1], c[2]);
  const ACCENT = C(pal.title), BOXC = C(pal.box), INFO = C(pal.info), GOLD = C(pal.rule);
  const TINT_GOLD = C(pal.ruleTint), TINT_ACCENT = C(pal.infoTint);
  const doc = await PDFDocument.create();
  doc.setTitle(`Convite — ${m.recipientName}`);
  let F: { serif: PDFFont; serifBold: PDFFont; serifItalic: PDFFont };
  let clean: (s: string) => string;
  if (bytes) {
    doc.registerFontkit(fontkit);
    const e = (b: ArrayBuffer | Uint8Array) => doc.embedFont(b, { subset: true });
    const [serif, serifBold, serifItalic] = await Promise.all([e(bytes.serif), e(bytes.serifBold), e(bytes.serifItalic)]);
    F = { serif, serifBold, serifItalic };
    clean = (s) => s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
  } else {
    const [serif, serifBold, serifItalic] = await Promise.all([StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic].map((f) => doc.embedFont(f)));
    F = { serif, serifBold, serifItalic };
    clean = winAnsi;
  }

  const W = 595, H = 842, M = lv.side, CW = W - M * 2, B = lv.size, G = (n: number) => n * lv.gap;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - lv.top;
  const annots: unknown[] = [];
  const newPage = () => { page = doc.addPage([W, H]); y = H - lv.top; };
  const ensure = (h: number) => { if (y - h < lv.bottom) newPage(); };
  type TO = { font?: PDFFont; size?: number; align?: "left" | "center" | "right" | "justify"; x?: number; width?: number; gap?: number; color?: RGB; lead?: number; indent?: number };
  const text = (s: string, o: TO = {}) => {
    if (!s.trim()) return;
    const font = o.font ?? F.serif, size = o.size ?? B, x0 = o.x ?? M, width = o.width ?? CW, lead = o.lead ?? size * 1.42, ind = o.indent ?? 0;
    for (const ln of wrapP(s, font, size, width, clean, ind)) {
      ensure(lead);
      const base = y - size, xs = x0 + (ln.first ? ind : 0), ws = width - (ln.first ? ind : 0);
      if (o.align === "justify" && !ln.last && ln.text.includes(" ")) {
        const words = ln.text.split(" ");
        const wsum = words.reduce((a, w) => a + font.widthOfTextAtSize(w, size), 0);
        const gapW = (ws - wsum) / (words.length - 1);
        let x = xs;
        for (const w of words) { page.drawText(w, { x, y: base, size, font, color: o.color ?? INK }); x += font.widthOfTextAtSize(w, size) + gapW; }
      } else {
        const w = font.widthOfTextAtSize(ln.text, size);
        const x = o.align === "center" ? x0 + (width - w) / 2 : o.align === "right" ? x0 + width - w : xs;
        page.drawText(ln.text, { x, y: base, size, font, color: o.color ?? INK });
      }
      y -= lead;
    }
    y -= o.gap ?? 0;
  };
  const rule = (color: RGB, x1 = M, x2 = W - M, th = 0.6) => page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: th, color });

  // Timbre (fonte própria do cabeçalho)
  const style = headerStyleOf(t);
  if (style === "formal") {
    // Formal: nome e circuito à esquerda; endereço e telefone alinhados à direita; linha dupla.
    const top0 = y, colW = CW * 0.55;
    text(t.headerTitle, { font: F.serifBold, size: 19, width: colW, lead: 24, color: ACCENT });
    text(t.headerSubtitle, { size: 11, width: colW, lead: 15 });
    const leftEnd = y; y = top0 + 2;
    const rx = M + colW + 10, rw = CW - colW - 10;
    text(t.headerAddress, { size: 8, x: rx, width: rw, align: "right", lead: 11, color: MUTED });
    text(t.headerPhone, { size: 8, x: rx, width: rw, align: "right", lead: 11, color: MUTED });
    y = Math.min(y, leftEnd) - G(6);
    rule(ACCENT, M, W - M, 1.1); y -= 2.5; rule(GOLD, M, W - M, 0.5); y -= G(20);
  } else if (style === "institutional") {
    // Institucional: faixa sólida no topo; contatos vão para o rodapé de cada página.
    const BH = 64;
    page.drawRectangle({ x: 0, y: H - BH, width: W, height: BH, color: ACCENT });
    page.drawRectangle({ x: 0, y: H - BH - 3, width: W, height: 3, color: GOLD });
    const name = clean(t.headerTitle.trim()), sub = clean(t.headerSubtitle.trim());
    if (name) page.drawText(name, { x: M, y: H - BH / 2 - 7, size: 18, font: F.serifBold, color: WHITE });
    if (sub) { const sw = F.serif.widthOfTextAtSize(sub, 11); page.drawText(sub, { x: W - M - sw, y: H - BH / 2 - 5, size: 11, font: F.serif, color: WHITE }); }
    y = Math.min(y, H - BH - 3 - G(26));
  } else {
    text(t.headerTitle, { font: F.serifBold, size: 22, align: "center", lead: 28, color: ACCENT });
    text(t.headerSubtitle, { size: 12, align: "center", lead: 17 });
    text(t.headerAddress, { size: 8.5, align: "center", lead: 12, color: MUTED });
    text(t.headerPhone, { size: 8.5, align: "center", lead: 12, color: MUTED });
    y -= G(8); rule(GOLD, M + CW * 0.2, W - M - CW * 0.2, 0.8); y -= G(20);
  }

  text(m.date, { size: B - 1, align: "right", color: MUTED, gap: G(12) });
  text(m.recipientName, { font: F.serifBold, lead: B * 1.35 });
  text(m.recipientCong, { size: B - 1, color: MUTED, gap: G(10) });
  if (t.refLine.trim()) {
    ensure(B * 1.5);
    const lab = "Ref.: ";
    page.drawText(lab, { x: M, y: y - B, size: B, font: F.serifBold, color: ACCENT });
    const lw = F.serifBold.widthOfTextAtSize(lab, B);
    text(t.refLine, { font: F.serifBold, x: M + lw, width: CW - lw, gap: G(10) });
  }
  text(t.salutation, { gap: G(6) });
  text(t.opening, { align: "justify", indent: INDENT, gap: G(12) });

  // Quadro da designação (automático, compacto). Medido antes de desenhar: nada transborda.
  // Coluna do rótulo cabe no maior rótulo curto; rótulo longo vai numa linha própria, acima do texto.
  const PADX = 12, PADY = 9, RL = 13.5, VS = 10, LS = 7.5, LAB_MAX = 100, STACK_H = 11;
  const [titleLine, ...rest] = m.box;
  const titleLines = wrapP(titleLine ?? "", F.serifBold, 11.5, CW - PADX * 2, clean);
  const raw = rest.map((l) => {
    const k = l.indexOf(": ");
    const label = k > 0 && k < 40 ? clean(l.slice(0, k).toUpperCase()) : "";
    return { label, val: label ? l.slice(k + 2) : l, lw: label ? F.serifBold.widthOfTextAtSize(label, LS) : 0 };
  });
  const LABW = Math.min(LAB_MAX, Math.max(40, ...raw.filter((r) => r.lw <= LAB_MAX).map((r) => r.lw))) + 10;
  const FULLW = CW - PADX * 2;
  const rows = raw.map((r) => {
    const stacked = !!r.label && r.lw > LAB_MAX;
    return { label: r.label, stacked, lines: wrapP(r.val, F.serifBold, VS, r.label && !stacked ? FULLW - LABW : FULLW, clean) };
  });
  const pinLines = m.pinLine ? wrapP(m.pinLine, F.serif, 9, CW - PADX * 2, clean) : [];
  const bh = 20;
  const boxH = PADY + titleLines.length * 15 + 6 + rows.reduce((a, r) => a + (r.stacked ? STACK_H : 0) + r.lines.length * RL + 1, 0) + 6 + bh + (pinLines.length ? 4 + pinLines.length * 12 : 0) + PADY;
  ensure(boxH);
  const top = y;
  page.drawSvgPath(roundRect(CW, boxH, 8), { x: M, y: top, ...(pal.boxFill ? { color: C(pal.boxFill) } : {}), borderColor: GOLD, borderWidth: 0.8 });
  y -= PADY;
  for (const l of titleLines) { page.drawText(l.text, { x: M + PADX, y: y - 11.5, size: 11.5, font: F.serifBold, color: BOXC }); y -= 15; }
  y -= 2; rule(GOLD, M + PADX, W - M - PADX, 0.4); y -= 4;
  for (const r of rows) {
    if (r.label) page.drawText(r.label, { x: M + PADX, y: y - 9.5, size: LS, font: F.serifBold, color: MUTED });
    if (r.stacked) y -= STACK_H;
    const vx = r.label && !r.stacked ? M + PADX + LABW : M + PADX;
    for (const l of r.lines) { page.drawText(l.text, { x: vx, y: y - VS, size: VS, font: F.serifBold, color: INK }); y -= RL; }
    y -= 1;
  }
  y -= 6;
  const label = "Clique aqui!", bw = F.serifBold.widthOfTextAtSize(label, 10.5) + 32;
  const prompt = "Para aceitar ou recusar a designação:";
  const pw = F.serif.widthOfTextAtSize(clean(prompt), 9.5);
  const rowW = pw + 10 + bw, px = M + (CW - rowW) / 2, bx = px + pw + 10;
  page.drawText(clean(prompt), { x: px, y: y - bh / 2 - 3.5, size: 9.5, font: F.serif, color: INK });
  page.drawSvgPath(roundRect(bw, bh, bh / 2), { x: bx, y, color: BOXC });
  page.drawText(label, { x: bx + 16, y: y - bh / 2 - 3.8, size: 10.5, font: F.serifBold, color: WHITE });
  annots.push(doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [bx, y - bh, bx + bw, y], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(m.linkUrl) },
  })));
  const linkPage = page;
  y -= bh;
  if (pinLines.length) { y -= 4; for (const l of pinLines) { const w = F.serif.widthOfTextAtSize(l.text, 9); page.drawText(l.text, { x: M + (CW - w) / 2, y: y - 9, size: 9, font: F.serif, color: MUTED }); y -= 12; } }
  y = top - boxH - G(18);

  // Faixa com barra lateral; altura medida antes, título nunca sobrepõe o conteúdo.
  const BS = B - 1.5, BL = BS * 1.42;
  const bandLines = (s: string, font: PDFFont) => (s.trim() ? wrapP(s, font, BS, CW - 26, clean) : []);
  const bandH = (c: WLine[]) => (c.length ? c.length * BL + 12 + c.filter((l) => l.last).length * 2 : 0);
  const band = (ls: WLine[], fill: RGB, bar: RGB, font: PDFFont) => {
    while (ls.length) {
      let n = 0;
      while (n < ls.length && bandH(ls.slice(0, n + 1)) <= y - lv.bottom) n++;
      if (n < Math.min(2, ls.length)) { newPage(); continue; }
      const chunk = ls.slice(0, n); ls = ls.slice(n);
      const h = bandH(chunk);
      page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: fill });
      page.drawRectangle({ x: M, y: y - h, width: 3, height: h, color: bar });
      y -= 6;
      for (const l of chunk) { page.drawText(l.text, { x: M + 14, y: y - BS, size: BS, font, color: INK }); y -= BL + (l.last ? 2 : 0); }
      y -= 6;
    }
    y -= G(10);
  };
  const hl = bandLines(t.highlight, F.serifBold), rm = bandLines(t.reminders, F.serif);
  if (t.remindersTitle.trim()) {
    const firstH = bandH((hl.length ? hl : rm).slice(0, 2));
    ensure(B * 1.4 + 12 + firstH);
    text(t.remindersTitle, { font: F.serifBold, color: ACCENT, lead: B * 1.35 });
    y -= 2; rule(GOLD, M, M + 40, 1); y -= 10;
  }
  band(hl, TINT_GOLD, GOLD, F.serifBold);
  band(rm, TINT_ACCENT, INFO, F.serif);
  text(t.rehearsal, { font: F.serifBold, gap: 0 });
  text(t.rehearsalNote, { font: F.serifItalic, size: B - 1.5, color: MUTED, gap: G(12) });
  text(t.closing, { align: "justify", indent: INDENT, gap: G(12) });
  text(t.signoff, { gap: G(6) });
  text(t.signature, { font: F.serifItalic, size: 13.5, align: "right", color: ACCENT });
  linkPage.node.set(PDFName.of("Annots"), doc.context.obj(annots as never[]));
  if (style === "institutional") {
    const foot = clean([t.headerAddress.trim(), t.headerPhone.trim()].filter(Boolean).join("  ·  "));
    if (foot) for (const pg of doc.getPages()) {
      let size = 7.5; while (size > 5.5 && F.serif.widthOfTextAtSize(foot, size) > CW) size -= 0.25;
      pg.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.4, color: GOLD });
      pg.drawText(foot, { x: M + (CW - F.serif.widthOfTextAtSize(foot, size)) / 2, y: 19, size, font: F.serif, color: MUTED });
    }
  }
  return doc;
}
