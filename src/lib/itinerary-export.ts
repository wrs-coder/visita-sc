/**
 * Exportação do itinerário (PDF lista/calendário, DOCX, XLSX) para partilhar
 * com os anciãos. Só usa datas e nomes — nunca códigos, telefones ou notas internas.
 */
import JSZip from "jszip";
import { parseCustomType } from "@/lib/itinerary-weeks";

export type ExportVisit = { start_date: string; end_date: string; title: string; congregation_id: string; is_active?: boolean };
export type ExportWeek = { start_date: string; end_date: string; week_type: "pioneer" | "free"; notes: string | null };
export type ExportRow = { start: string; end: string; kind: "visit" | "off"; title: string; detail: string };
export type PeriodMode = "next6" | "serviceYear" | "all";
export type ExportMeta = { circuit?: string | null; superintendent?: string | null; generatedAt: Date };

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEK_LABEL = { pioneer: "Semana de pioneiro", free: "Semana livre" } as const;

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const br = (s: string) => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

export function periodRange(mode: PeriodMode, today: Date): { from: string; to: string } | null {
  if (mode === "all") return null;
  if (mode === "next6") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    return { from: iso(from), to: iso(to) };
  }
  const y = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return { from: `${y}-09-01`, to: `${y + 1}-08-31` };
}

/** "Semana de pioneiro - Assembleia": rótulo + primeira linha das observações. */
export function offWeekTitle(w: Pick<ExportWeek, "week_type" | "notes">): string {
  const c = parseCustomType(w.notes);
  const label = c.name ?? WEEK_LABEL[w.week_type];
  const obs = (c.rest ?? "").split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return obs ? `${label} - ${obs}` : label;
}

export function buildExportRows(
  visits: ExportVisit[], congs: { id: string; name: string }[], weeks: ExportWeek[],
  opts: { range: { from: string; to: string } | null; includeOff: boolean },
): ExportRow[] {
  const names = new Map(congs.map((c) => [c.id, c.name]));
  const rows: ExportRow[] = visits.filter((v) => v.is_active !== false).map((v) => ({
    start: v.start_date, end: v.end_date || v.start_date, kind: "visit",
    title: names.get(v.congregation_id) ?? "Congregação", detail: v.title || "Visita",
  }));
  if (opts.includeOff) for (const w of weeks) {
    rows.push({ start: w.start_date, end: w.end_date || w.start_date, kind: "off", title: offWeekTitle(w), detail: "Sem visita" });
  }
  const r = opts.range;
  return rows.filter((x) => !r || (x.end >= r.from && x.start <= r.to)).sort((a, b) => a.start.localeCompare(b.start) || a.kind.localeCompare(b.kind));
}

export function periodLabel(rows: ExportRow[]): string {
  if (!rows.length) return "";
  const a = parse(rows[0].start), b = parse(rows[rows.length - 1].end);
  return `${MONTHS[a.getMonth()].slice(0, 3)} ${a.getFullYear()} – ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
}

/** Meses (ano, mês) do primeiro ao último item, em grupos de 3 — uma folha por grupo. */
export function monthPages(rows: ExportRow[]): { y: number; m: number }[][] {
  if (!rows.length) return [];
  const a = parse(rows[0].start), b = parse(rows[rows.length - 1].end);
  const list: { y: number; m: number }[] = [];
  for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) list.push({ y: d.getFullYear(), m: d.getMonth() });
  const pages: { y: number; m: number }[][] = [];
  for (let i = 0; i < list.length; i += 3) pages.push(list.slice(i, i + 3));
  return pages;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function header(meta: ExportMeta) {
  const circ = meta.circuit?.trim() ? `Itinerário do circuito ${meta.circuit.trim()}` : "Itinerário do circuito";
  return { title: circ, sub: meta.superintendent?.trim() ? `Superintendente: ${meta.superintendent.trim()}` : "" };
}

export function itineraryListHtml(rows: ExportRow[], meta: ExportMeta): string {
  const h = header(meta);
  let html = `<h1>${esc(h.title)}</h1>`;
  if (h.sub) html += `<p>${esc(h.sub)}</p>`;
  html += `<p>${esc(periodLabel(rows))}</p>`;
  let month = "";
  for (const r of rows) {
    const d = parse(r.start), key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (key !== month) { month = key; html += `<h2>${esc(key)}</h2>`; }
    const mark = r.kind === "visit" ? "●" : "○";
    html += `<p><strong>${br(r.start)} – ${br(r.end)}</strong>  ${mark} ${esc(r.title)}${r.kind === "visit" && r.detail !== "Visita" ? ` <em>(${esc(r.detail)})</em>` : r.kind === "off" ? " <em>(sem visita)</em>" : ""}</p>`;
  }
  html += `<p><em>● visita   ○ sem visita · Gerado em ${pad(meta.generatedAt.getDate())}/${pad(meta.generatedAt.getMonth() + 1)}/${meta.generatedAt.getFullYear()}</em></p>`;
  return html;
}

// ---------- XLSX (JSZip, sem dependência nova) ----------

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const xmlEsc = (s: string) => esc(s).replace(/"/g, "&quot;");

export function xlsxSheetXml(rows: ExportRow[]): string {
  const head = ["Semana", "Início", "Fim", "Tipo", "Congregação / evento", "Observação"];
  const cell = (ref: string, v: string, s: number) => `<c r="${ref}" t="inlineStr" s="${s}"><is><t>${xmlEsc(v)}</t></is></c>`;
  const cols = "ABCDEF";
  const lines = [head, ...rows.map((r, i) => [String(i + 1), br(r.start) + "/" + parse(r.start).getFullYear(), br(r.end) + "/" + parse(r.end).getFullYear(), r.kind === "visit" ? "Visita" : "Sem visita", r.title, r.kind === "visit" ? r.detail : ""])];
  const data = lines.map((l, ri) => `<row r="${ri + 1}">${l.map((v, ci) => cell(`${cols[ci]}${ri + 1}`, v, ri === 0 ? 1 : rows[ri - 1].kind === "off" ? 2 : 0)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="3" width="13" customWidth="1"/><col min="4" max="4" width="12" customWidth="1"/><col min="5" max="5" width="36" customWidth="1"/><col min="6" max="6" width="24" customWidth="1"/></cols><sheetData>${data}</sheetData><autoFilter ref="A1:F${lines.length}"/></worksheet>`;
}

export async function itineraryXlsx(rows: ExportRow[]): Promise<Blob> {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Itinerário" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Itinerário'!$A$1:$F$${rows.length + 1}</definedName></definedNames></workbook>`);
  z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><i/><sz val="11"/><color rgb="FF6B7280"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F5D50"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf fontId="2" applyFont="1"/></cellXfs></styleSheet>`);
  z.file("xl/worksheets/sheet1.xml", xlsxSheetXml(rows));
  return z.generateAsync({ type: "blob", mimeType: XLSX_MIME });
}

// ---------- PDF (pdf-lib via pdf-engine) ----------

const C = { ink: [31, 41, 55], muted: [107, 114, 128], accent: [47, 93, 80], visit: [220, 236, 230], off: [236, 236, 238], line: [214, 219, 224] } as const;
type Doc = Awaited<ReturnType<typeof import("@/lib/pdf/pdf-engine").createJsPdfCompat>>;
const fill = (d: Doc, c: readonly number[]) => d.setFillColor(c[0], c[1], c[2]);
const color = (d: Doc, c: readonly number[]) => d.setTextColor(c[0], c[1], c[2]);
function fit(d: Doc, s: string, w: number): string {
  if (d.measureText(s) <= w) return s;
  let t = s;
  while (t.length > 1 && d.measureText(t + "...") > w) t = t.slice(0, -1);
  return t.trimEnd() + "...";
}
function footer(d: Doc, meta: ExportMeta) {
  d.setFont(false); d.setFontSize(8); color(d, C.muted);
  fill(d, C.visit); d.rect(10, d.pageH - 10, 4, 3, "F"); d.text("visita", 16, d.pageH - 7.5);
  fill(d, C.off); d.rect(30, d.pageH - 10, 4, 3, "F"); d.text("sem visita", 36, d.pageH - 7.5);
  d.text(`Gerado em ${pad(meta.generatedAt.getDate())}/${pad(meta.generatedAt.getMonth() + 1)}/${meta.generatedAt.getFullYear()}`, d.pageW - 10, d.pageH - 7.5, { align: "right" });
}

export async function itineraryPdfList(rows: ExportRow[], meta: ExportMeta): Promise<Blob> {
  const { createJsPdfCompat } = await import("@/lib/pdf/pdf-engine");
  const d = await createJsPdfCompat({ unit: "mm" });
  const h = header(meta);
  const top = () => {
    d.setFont(true); d.setFontSize(16); color(d, C.accent); d.text(h.title.toUpperCase(), 15, 20);
    d.setFont(false); d.setFontSize(10); color(d, C.muted);
    d.text([h.sub, periodLabel(rows)].filter(Boolean).join("  ·  "), 15, 26);
    d.setDrawColor(C.line[0], C.line[1], C.line[2]); d.line(15, 30, d.pageW - 15, 30);
    return 38;
  };
  let y = top(); let month = "";
  for (const r of rows) {
    const dt = parse(r.start), key = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
    const need = key !== month ? 18 : 9;
    if (y + need > d.pageH - 16) { footer(d, meta); d.addPage(); y = top(); month = ""; }
    if (key !== month) { month = key; d.setFont(true); d.setFontSize(10); color(d, C.accent); d.text(key.toUpperCase(), 15, y + 2); y += 7; }
    fill(d, r.kind === "visit" ? C.visit : C.off); d.rect(15, y - 4.5, d.pageW - 30, 7.5, "F");
    d.setFont(true); d.setFontSize(10); color(d, C.ink); d.text(`${br(r.start)} – ${br(r.end)}`, 18, y + 0.5);
    d.setFont(r.kind === "visit"); color(d, r.kind === "visit" ? C.ink : C.muted);
    d.text(fit(d, r.title, 95), 50, y + 0.5);
    d.setFont(false); d.setFontSize(9); color(d, C.muted);
    d.text(fit(d, r.kind === "visit" ? r.detail : "Sem visita", 40), d.pageW - 18, y + 0.5, { align: "right" });
    y += 9;
  }
  if (!rows.length) { d.setFontSize(11); color(d, C.muted); d.text("Nenhuma semana no período escolhido.", 15, y); }
  footer(d, meta);
  return d.output("blob");
}

/** Calendário: A4 deitado, 3 meses por folha. */
export async function itineraryPdfCalendar(rows: ExportRow[], meta: ExportMeta): Promise<Blob> {
  const { createJsPdfCompat } = await import("@/lib/pdf/pdf-engine");
  const d = await createJsPdfCompat({ unit: "mm", orientation: "l" });
  const h = header(meta);
  const pages = monthPages(rows);
  if (!pages.length) pages.push([]);
  const gap = 6, left = 10, colW = (d.pageW - left * 2 - gap * 2) / 3, cell = colW / 7;
  pages.forEach((months, pi) => {
    if (pi) d.addPage();
    d.setFont(true); d.setFontSize(14); color(d, C.accent); d.text(h.title.toUpperCase(), left, 14);
    d.setFont(false); d.setFontSize(9); color(d, C.muted);
    const span = months.length ? `${MONTHS[months[0].m]} ${months[0].y} – ${MONTHS[months[months.length - 1].m]} ${months[months.length - 1].y}` : "";
    d.text([h.sub, span, `Folha ${pi + 1} de ${pages.length}`].filter(Boolean).join("  ·  "), left, 20);
    months.forEach(({ y, m }, ci) => {
      const x0 = left + ci * (colW + gap); let yy = 30;
      d.setFont(true); d.setFontSize(11); color(d, C.ink); d.text(`${MONTHS[m]} ${y}`, x0, yy);
      yy += 6; d.setFont(true); d.setFontSize(7.5); color(d, C.muted);
      ["S", "T", "Q", "Q", "S", "S", "D"].forEach((l, i) => d.text(l, x0 + i * cell + cell / 2, yy, { align: "center" }));
      yy += 2;
      const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
      const offset = (first.getDay() + 6) % 7;
      const weeksN = Math.ceil((offset + days) / 7), rowH = 14;
      for (let w = 0; w < weeksN; w++) {
        const ry = yy + w * rowH;
        d.setDrawColor(C.line[0], C.line[1], C.line[2]); d.setLineWidth(0.2); d.line(x0, ry, x0 + colW, ry);
        d.setFont(false); d.setFontSize(7); color(d, C.muted);
        const cellsDays: (string | null)[] = [];
        for (let i = 0; i < 7; i++) {
          const day = w * 7 + i - offset + 1;
          if (day >= 1 && day <= days) { d.text(String(day), x0 + i * cell + 1, ry + 3.5); cellsDays.push(iso(new Date(y, m, day))); } else cellsDays.push(null);
        }
        // uma faixa por evento que toca esta semana
        const hits = rows.filter((r) => cellsDays.some((s) => s && s >= r.start && s <= r.end)); // eventos não se sobrepõem: todos na mesma faixa
        for (const r of hits) {
          const idx = cellsDays.map((s, i) => (s && s >= r.start && s <= r.end ? i : -1)).filter((i) => i >= 0);
          const a = idx[0], b = idx[idx.length - 1];
          const bx = x0 + a * cell + 0.3, bw = (b - a + 1) * cell - 0.6;
          fill(d, r.kind === "visit" ? C.visit : C.off); d.rect(bx, ry + 5, bw, 7, "F");
          d.setFont(r.kind === "visit"); d.setFontSize(8); color(d, r.kind === "visit" ? C.ink : C.muted);
          if (b - a >= 1 || hits.length === 1) d.text(fit(d, r.title, bw - 2), bx + 1.2, ry + 9.8);
        }
      }
      d.line(x0, yy + weeksN * rowH, x0 + colW, yy + weeksN * rowH);
    });
    footer(d, meta);
  });
  return d.output("blob");
}
