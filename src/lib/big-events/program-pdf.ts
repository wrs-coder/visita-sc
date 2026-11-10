// Programa do evento em PDF (A4 retrato, sempre 1 página) para acompanhar durante a assembleia.
// Cabeçalho em faixa, Manhã/Tarde, horários, temas completos, designados e participações.
// Se não couber, reduz letra e espaçamento até caber numa única folha.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadLetterFonts, winAnsi } from "./letter-render";
import { extrasLabel, formatEventDate, toMin } from "./invite";
import { isFloatingType } from "./program-rules";

export interface ProgramEvent { name: string; event_date: string | null; location: string | null; start_time: string | null }
export interface ProgramPart {
  part_time: string | null; duration_min: number | null; theme: string; outline_number: string | null;
  part_type_label: string | null; symposium: boolean; assigned_to: string; speaker_name: string | null;
  speaker_congregation: string | null; status: string; time_mode: string; sort_order: number;
  talk_includes?: unknown;
}

const INK = rgb(0.12, 0.13, 0.16), MUTED = rgb(0.44, 0.46, 0.5), ACCENT = rgb(0.1, 0.24, 0.42), GOLD = rgb(0.72, 0.6, 0.38),
  OK = rgb(0.1, 0.5, 0.28), WARN = rgb(0.8, 0.5, 0.05), RED = rgb(0.75, 0.15, 0.15), LINE = rgb(0.88, 0.89, 0.9), WHITE = rgb(1, 1, 1),
  SOFT = rgb(0.95, 0.96, 0.97);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= width || !line) line = t; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export function whoLabel(p: ProgramPart): string | null {
  if (p.assigned_to === "co") return "Superintendente de circuito";
  if (p.assigned_to === "branch") return "Representante da filial";
  if (p.assigned_to !== "speaker") return null;
  const n = p.speaker_name?.trim();
  return n ? [n, p.speaker_congregation?.trim() ? `Cong. ${p.speaker_congregation.trim()}` : null].filter(Boolean).join(" · ") : "Ancião a definir";
}

type Fonts = { R: PDFFont; B: PDFFont; I: PDFFont; clean: (s: string) => string };

/** Desenha o programa numa escala; devolve a altura que faltou (0 = coube). */
function draw(page: PDFPage | null, F: Fonts, ev: ProgramEvent, sorted: ProgramPart[], k: number): number {
  const { R, B, I, clean } = F;
  const W = 595.28, H = 841.89, M = 40, BH = 64 * Math.max(0.8, k);
  const TIMEW = 44 * k + 8, NUMW = 18 * k, TX = M + TIMEW + NUMW, TW = W - TX - M;
  const fs = 10.5 * k, small = 8.6 * k, lead = fs * 1.28;
  let y = H;
  if (page) {
    page.drawRectangle({ x: 0, y: H - BH, width: W, height: BH, color: ACCENT });
    page.drawRectangle({ x: 0, y: H - BH - 2.5, width: W, height: 2.5, color: GOLD });
  }
  const title = clean(ev.name.toUpperCase());
  let ts = 17 * Math.max(0.8, k);
  while (ts > 10 && B.widthOfTextAtSize(title, ts) > W - 2 * M) ts -= 0.5;
  const sub = clean([ev.event_date ? formatEventDate(ev.event_date) : null, ev.location].filter(Boolean).join("  ·  "));
  if (page) {
    page.drawText(title, { x: (W - B.widthOfTextAtSize(title, ts)) / 2, y: H - BH / 2 + (sub ? 2 : -ts / 3), size: ts, font: B, color: WHITE });
    if (sub) page.drawText(sub, { x: (W - R.widthOfTextAtSize(sub, 9.5)) / 2, y: H - BH / 2 - 15, size: 9.5, font: R, color: WHITE });
  }
  y = H - BH - 2.5 - 16 * k;

  let period: string | null = null;
  for (const p of sorted) {
    const min = toMin(p.part_time);
    const per: string | null = min == null ? period : min < 12 * 60 ? "MANHÃ" : "TARDE";
    if (per && per !== period) {
      y -= period ? 8 * k : 0;
      if (page) {
        page.drawText(per, { x: M, y: y - 9 * k, size: 9 * k, font: B, color: ACCENT });
        const lw = B.widthOfTextAtSize(per, 9 * k) + 8;
        page.drawLine({ start: { x: M + lw, y: y - 6 * k }, end: { x: W - M, y: y - 6 * k }, thickness: 0.6, color: GOLD });
      }
      y -= 16 * k; period = per;
    }
    const floating = isFloatingType(p.part_type_label);
    const none = p.assigned_to === "none";
    const themeFont = none ? R : B;
    const lines = wrap(clean(p.theme), themeFont, floating ? fs * 0.92 : fs, TW);
    const who = whoLabel(p);
    const extras = extrasLabel(p.talk_includes);
    const meta = [floating ? null : p.part_type_label, p.duration_min ? `${p.duration_min} min` : null, extras].filter(Boolean).join(" · ");
    const sec = [who, meta].filter(Boolean).join("   |   ");
    const secLines = sec ? wrap(clean(sec), R, small, TW - 60 * k) : [];
    const h = lines.length * lead + secLines.length * small * 1.3 + 7 * k;
    if (page) {
      if (p.outline_number && !floating && !none) {
        // Número do esboço num círculo discreto.
        const cx = M + TIMEW + NUMW / 2 - 2, cy = y - fs * 0.62;
        page.drawCircle({ x: cx, y: cy, size: 7.2 * k, color: SOFT, borderColor: ACCENT, borderWidth: 0.6 });
        const ns = clean(p.outline_number), nz = 7 * k;
        page.drawText(ns, { x: cx - B.widthOfTextAtSize(ns, nz) / 2, y: cy - nz / 3, size: nz, font: B, color: ACCENT });
      }
      page.drawText(clean(p.part_time ?? ""), { x: M, y: y - fs, size: fs * 0.95, font: floating ? R : B, color: floating ? MUTED : INK });
      let yy = y;
      for (const l of lines) { page.drawText(l, { x: TX, y: yy - fs, size: floating ? fs * 0.92 : fs, font: floating ? I : themeFont, color: none ? MUTED : INK }); yy -= lead; }
      for (const l of secLines) { page.drawText(l, { x: TX, y: yy - small, size: small, font: p.speaker_name ? R : I, color: MUTED }); yy -= small * 1.3; }
      if (p.assigned_to === "speaker" && p.speaker_name) {
        const [s, c] = p.status === "confirmed" ? ["confirmado", OK] : p.status === "declined" ? ["recusou", RED] : ["pendente", WARN];
        const sw = B.widthOfTextAtSize(s, small * 0.92);
        page.drawCircle({ x: W - M - sw - 6, y: y - fs * 0.62, size: 2.4 * k, color: c });
        page.drawText(clean(s), { x: W - M - sw, y: y - fs * 0.62 - small * 0.33, size: small * 0.92, font: B, color: c });
      }
      page.drawLine({ start: { x: TX, y: y - h + 3 * k }, end: { x: W - M, y: y - h + 3 * k }, thickness: 0.35, color: LINE });
    }
    y -= h;
  }
  const bottom = 34;
  if (page) {
    const s = clean(`Programa · ${ev.name}`);
    page.drawText(s, { x: (W - R.widthOfTextAtSize(s, 7.5)) / 2, y: 18, size: 7.5, font: R, color: MUTED });
  }
  return Math.max(0, bottom - y);
}

export async function programPdf(ev: ProgramEvent, partsIn: ProgramPart[]): Promise<Uint8Array> {
  const sorted = [...partsIn].sort((a, b) => a.sort_order - b.sort_order);
  const doc = await PDFDocument.create();
  doc.setTitle(`Programa — ${ev.name}`);
  const bytes = await loadLetterFonts();
  let F: Fonts;
  if (bytes) {
    doc.registerFontkit(fontkit);
    const [R, B, I] = await Promise.all([bytes.sans, bytes.sansBold, bytes.sansItalic].map((b) => doc.embedFont(b, { subset: true })));
    F = { R, B, I, clean: (s) => s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "") };
  } else {
    const [R, B, I] = await Promise.all([StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique].map((f) => doc.embedFont(f)));
    F = { R, B, I, clean: winAnsi };
  }
  // Mede antes de desenhar: escolhe a maior escala que cabe em uma página.
  let k = 1.12;
  while (k > 0.5 && draw(null, F, ev, sorted, k) > 0) k -= 0.02;
  draw(doc.addPage([595.28, 841.89]), F, ev, sorted, k);
  return doc.save();
}
