// Relatório do Controle de tempo em PDF (A4): previsto × real por parte e desvio por ancião.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadLetterFonts, winAnsi } from "./letter-render";
import { formatEventDate } from "./invite";
import { buildRows, clock, programLabel, signed, type Summary, type TimerPart } from "./event-timer";

const INK = rgb(0.12, 0.13, 0.16), MUTED = rgb(0.44, 0.46, 0.5), ACCENT = rgb(0.1, 0.24, 0.42), GOLD = rgb(0.72, 0.6, 0.38),
  OK = rgb(0.1, 0.5, 0.28), RED = rgb(0.75, 0.15, 0.15), LINE = rgb(0.88, 0.89, 0.9), WHITE = rgb(1, 1, 1);

export async function timerReportPdf(ev: { name: string; event_date: string | null; location: string | null }, parts: TimerPart[], sum: Summary): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Relatório de tempo — ${ev.name}`);
  const bytes = await loadLetterFonts();
  let R: PDFFont, B: PDFFont, clean: (s: string) => string;
  if (bytes) {
    doc.registerFontkit(fontkit);
    [R, B] = await Promise.all([bytes.sans, bytes.sansBold].map((b) => doc.embedFont(b, { subset: true })));
    clean = (s) => s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
  } else {
    [R, B] = await Promise.all([StandardFonts.Helvetica, StandardFonts.HelveticaBold].map((f) => doc.embedFont(f)));
    clean = winAnsi;
  }
  const W = 595.28, H = 841.89, M = 40;
  let page: PDFPage = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: ACCENT });
  page.drawRectangle({ x: 0, y: H - 66.5, width: W, height: 2.5, color: GOLD });
  const t = clean(`RELATÓRIO DE TEMPO · ${ev.name.toUpperCase()}`);
  let ts = 15; while (ts > 9 && B.widthOfTextAtSize(t, ts) > W - 2 * M) ts -= 0.5;
  page.drawText(t, { x: (W - B.widthOfTextAtSize(t, ts)) / 2, y: H - 30, size: ts, font: B, color: WHITE });
  const sub = clean([ev.event_date ? formatEventDate(ev.event_date) : null, ev.location].filter(Boolean).join("  ·  "));
  if (sub) page.drawText(sub, { x: (W - R.widthOfTextAtSize(sub, 9.5)) / 2, y: H - 47, size: 9.5, font: R, color: WHITE });
  let y = H - 92;
  const head = clean(programLabel(sum.programDiff).replace("Programa", "Programa terminou").replace("terminou no horário", "terminou no horário"));
  page.drawText(head, { x: M, y, size: 13, font: B, color: sum.programDiff > 30_000 ? RED : sum.programDiff < -30_000 ? OK : INK });
  y -= 26;
  const cols = [M, W - M - 190, W - M - 125, W - M - 60];
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const row = (cells: string[], font: PDFFont, color = INK, diffColor = color, indent = 0) => {
    if (y < M + 20) newPage();
    const maxW = cols[1] - cols[0] - 10 - indent;
    let name = clean(cells[0]);
    while (name.length > 3 && font.widthOfTextAtSize(name, 9.5) > maxW) name = name.slice(0, -2);
    if (name !== clean(cells[0])) name += "…";
    page.drawText(name, { x: cols[0] + indent, y, size: 9.5, font, color });
    cells.slice(1).forEach((c, i) => {
      const s = clean(c), x = cols[i + 1] + 55 - font.widthOfTextAtSize(s, 9.5);
      page.drawText(s, { x, y, size: 9.5, font, color: i === 2 ? diffColor : color });
    });
    y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.35, color: LINE }); y -= 11;
  };
  row(["Parte", "Previsto", "Real", "Diferença"], B, MUTED);
  for (const r of buildRows(parts)) {
    const p = r.part, res = sum.parts[p.id];
    if (!res || (!res.done && res.actual === 0)) continue;
    const label = [p.outline_number ? `${p.outline_number}.` : null, p.theme, p.speaker_name ? `— ${p.speaker_name}` : null].filter(Boolean).join(" ");
    const dc = res.diff == null ? MUTED : res.diff > 30_000 ? RED : res.diff < -30_000 ? OK : INK;
    row([label, res.planned != null ? clock(res.planned) : "—", clock(res.actual), res.diff != null ? signed(res.diff) : "—"], r.kind === "head" ? B : R, INK, dc, r.kind === "item" ? 12 : 0);
  }
  if (sum.bySpeaker.length) {
    y -= 14; if (y < M + 60) newPage();
    page.drawText(clean("POR ANCIÃO"), { x: M, y, size: 9, font: B, color: ACCENT }); y -= 18;
    for (const s of sum.bySpeaker) {
      const dc = s.diff > 30_000 ? RED : s.diff < -30_000 ? OK : INK;
      row([`${s.name}${s.parts > 1 ? ` (${s.parts} partes)` : ""}`, "", "", signed(s.diff)], R, INK, dc);
    }
  }
  return doc.save();
}
