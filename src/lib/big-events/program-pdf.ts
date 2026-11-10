// Programa do evento em PDF (A4) para acompanhar durante a assembleia: horários, temas completos e designados.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadLetterFonts, winAnsi } from "./letter-render";
import { formatEventDate, toMin } from "./invite";

export interface ProgramEvent { name: string; event_date: string | null; location: string | null; start_time: string | null }
export interface ProgramPart {
  part_time: string | null; duration_min: number | null; theme: string; outline_number: string | null;
  part_type_label: string | null; symposium: boolean; assigned_to: string; speaker_name: string | null;
  speaker_congregation: string | null; status: string; time_mode: string; sort_order: number;
}

const INK = rgb(0.13, 0.14, 0.17), MUTED = rgb(0.45, 0.47, 0.5), ACCENT = rgb(0.12, 0.3, 0.55), OK = rgb(0.1, 0.5, 0.28), WARN = rgb(0.75, 0.45, 0.05), RED = rgb(0.75, 0.15, 0.15), LINE = rgb(0.85, 0.86, 0.88);

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
  return n ? [n, p.speaker_congregation?.trim() ? `Cong. ${p.speaker_congregation.trim()}` : null].filter(Boolean).join(" · ") : "Orador a definir";
}

export async function programPdf(ev: ProgramEvent, partsIn: ProgramPart[]): Promise<Uint8Array> {
  const sorted = [...partsIn].sort((a, b) => a.sort_order - b.sort_order);
  const doc = await PDFDocument.create();
  doc.setTitle(`Programa — ${ev.name}`);
  const bytes = await loadLetterFonts();
  let R: PDFFont, B: PDFFont, I: PDFFont, clean: (s: string) => string;
  if (bytes) {
    doc.registerFontkit(fontkit);
    [R, B, I] = await Promise.all([bytes.sans, bytes.sansBold, bytes.sansItalic].map((b) => doc.embedFont(b, { subset: true })));
    clean = (s) => s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
  } else {
    [R, B, I] = await Promise.all([StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique].map((f) => doc.embedFont(f)));
    clean = winAnsi;
  }
  const W = 595.28, H = 841.89, M = 48, TIMEW = 54, TX = M + TIMEW, TW = W - TX - M;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < M + 20) newPage(); };

  // Cabeçalho
  for (const l of wrap(clean(ev.name.toUpperCase()), B, 18, W - 2 * M)) {
    page.drawText(l, { x: (W - B.widthOfTextAtSize(l, 18)) / 2, y: y - 18, size: 18, font: B, color: ACCENT }); y -= 24;
  }
  const sub = clean([ev.event_date ? formatEventDate(ev.event_date) : null, ev.location].filter(Boolean).join(" · "));
  if (sub) { page.drawText(sub, { x: (W - R.widthOfTextAtSize(sub, 11)) / 2, y: y - 12, size: 11, font: R, color: MUTED }); y -= 20; }
  y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: ACCENT }); y -= 18;

  let period: string | null = null;
  sorted.forEach((p) => {
    const t = p.part_time || null;
    const min = toMin(t);
    const per = min == null ? period : min < 12 * 60 ? "MANHÃ" : "TARDE";
    if (per && per !== period) {
      ensure(30); y -= 4;
      page.drawText(per, { x: M, y: y - 11, size: 11, font: B, color: ACCENT }); y -= 20;
      period = per;
    }
    const theme = wrap(clean([p.outline_number ? `Nº ${p.outline_number} ·` : null, p.theme].filter(Boolean).join(" ")), B, 11, TW);
    const who = whoLabel(p);
    const meta = [p.part_type_label, p.duration_min ? `${p.duration_min} min` : null, p.symposium ? "Simpósio" : null].filter(Boolean).join(" · ");
    const h = theme.length * 14 + (who ? 14 : 0) + (meta || p.assigned_to === "speaker" ? 13 : 0) + 12;
    ensure(h);
    page.drawText(clean(t ?? "—"), { x: M, y: y - 11, size: 11, font: B, color: INK });
    for (const l of theme) { page.drawText(l, { x: TX, y: y - 11, size: 11, font: B, color: INK }); y -= 14; }
    if (who) { page.drawText(clean(who), { x: TX, y: y - 10, size: 10, font: p.speaker_name ? R : I, color: INK }); y -= 14; }
    if (meta || p.assigned_to === "speaker") {
      let x = TX;
      if (meta) { const s = clean(meta); page.drawText(s, { x, y: y - 9, size: 9, font: R, color: MUTED }); x += R.widthOfTextAtSize(s, 9) + 10; }
      if (p.assigned_to === "speaker" && p.speaker_name) {
        const [s, c] = p.status === "confirmed" ? ["confirmado", OK] : p.status === "declined" ? ["recusou", RED] : ["pendente", WARN];
        page.drawText(clean(s), { x, y: y - 9, size: 9, font: B, color: c });
      }
      y -= 13;
    }
    y -= 4; page.drawLine({ start: { x: TX, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE }); y -= 8;
  });
  const pages = doc.getPages();
  pages.forEach((pg, n) => {
    const s = clean(`${ev.name} · ${n + 1}/${pages.length}`);
    pg.drawText(s, { x: (W - R.widthOfTextAtSize(s, 8)) / 2, y: 24, size: 8, font: R, color: MUTED });
  });
  return doc.save();
}
