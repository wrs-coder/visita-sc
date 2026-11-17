// "Programa da Semana da Visita" para o quadro de anúncios: uma página A4 (pdf-lib via createJsPdfCompat).
// Inspirado no quadro da congregação: faixa do topo, linha do tempo com designações à esquerda,
// faixas de cor por seção e tabela do serviço de campo. O que não existir no app sai em branco
// para preencher à mão. buildBoardModel é puro (testado); renderBoardPdf só desenha.
import type { MeetingPart } from "@/lib/meeting/meeting-store";
import { createJsPdfCompat } from "@/lib/pdf/pdf-engine";

export type BoardTone = "neutral" | "treasures" | "ministry" | "living" | "visit";
export interface BoardRow { who: string; text: string; minutes: number | null; tone: BoardTone; italic?: boolean; strong?: boolean }
export interface BoardField { day: string; am: { time: string; place: string }; pm: { time: string; place: string } }
export interface BoardModel {
  range: string; sc: string; congregation: string;
  midweekWhen: string; midweek: BoardRow[];
  weekendWhen: string; weekend: BoardRow[];
  specials: Array<{ time: string; text: string; place: string }>;
  field: BoardField[];
}

export interface BoardInput {
  startDate: string; endDate: string; sc: string; congregation: string;
  midweek: { at: string | null; chairman: string | null; parts: MeetingPart[] | null; serviceTalk: string | null; finalSong: string | null };
  weekend: { at: string | null; chairman?: string | null; publicTalk: string | null; finalTalk: string | null; openingSong: string | null; closingSong: string | null };
  pioneer: { at: string | null; place: string | null } | null;
  elders: { at: string | null; place: string | null } | null;
  field: Array<{ date: string; period: string; time: string | null; place: string | null }>;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const FIELD_DAYS = ["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const d0 = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

export function formatRange(a: string, b: string): string {
  const x = d0(a), y = d0(b);
  if (x.getMonth() === y.getMonth()) return `${x.getDate()} a ${y.getDate()} de ${MONTHS[y.getMonth()]} de ${y.getFullYear()}`;
  return `${x.getDate()} de ${MONTHS[x.getMonth()]} a ${y.getDate()} de ${MONTHS[y.getMonth()]} de ${y.getFullYear()}`;
}
/** "2026-11-17T19:30:00" → { day: "Terça-feira", time: "19:30" } (hora local gravada). */
export function splitAt(at: string | null): { day: string; time: string } | null {
  if (!at) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(at);
  if (!m) return null;
  const dt = new Date(at);
  const local = Number.isNaN(dt.getTime()) ? d0(m[1]) : dt;
  const hh = Number.isNaN(dt.getTime()) ? `${m[2]}:${m[3]}` : `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  return { day: WEEKDAYS[local.getDay()], time: hh };
}
const toneOf = (p: MeetingPart): BoardTone => (p.section === "treasures" ? "treasures" : p.section === "ministry" ? "ministry" : p.section === "living" ? "living" : "neutral");
const song = (n: string | null) => (n && /\d/.test(n) ? `Cântico ${/(\d{1,3})/.exec(n)![1]}` : "Cântico ____");

export function buildBoardModel(i: BoardInput): BoardModel {
  const mw = splitAt(i.midweek.at), we = splitAt(i.weekend.at);
  const midweek: BoardRow[] = [{ who: i.midweek.chairman ?? "", text: "Presidência", minutes: null, tone: "neutral", strong: true }];
  if (i.midweek.parts?.length) {
    for (const p of i.midweek.parts) {
      if (p.kind === "comments" && p.section === "open") continue; // presidente já listado
      const isVisitTalk = p.assigned && p.assigned === i.sc && p.kind === "part" && p.section === "living" && p.minutes === 30;
      midweek.push({
        who: p.kind === "song" && !/ora[cç][aã]o/i.test(p.theme) ? "" : p.assigned, text: p.theme, minutes: p.kind === "song" ? null : p.minutes,
        tone: isVisitTalk ? "visit" : p.kind === "comments" ? "visit" : toneOf(p), italic: p.kind === "song",
      });
    }
  } else {
    midweek.push({ who: "", text: "Cântico e oração inicial", minutes: null, tone: "neutral", italic: true });
    midweek.push({ who: "", text: "(Programa da apostila desta semana)", minutes: null, tone: "neutral", italic: true });
    midweek.push({ who: i.sc, text: i.midweek.serviceTalk ?? "Discurso de serviço", minutes: 30, tone: "visit", strong: true });
    midweek.push({ who: "", text: `${song(i.midweek.finalSong)} e oração final`, minutes: null, tone: "neutral", italic: true });
  }
  const weekend: BoardRow[] = [
    { who: i.weekend.chairman ?? "", text: "Presidência", minutes: null, tone: "neutral", strong: true },
    { who: "", text: `${song(i.weekend.openingSong)} e oração inicial`, minutes: null, tone: "neutral", italic: true },
    { who: i.sc, text: i.weekend.publicTalk ?? "Discurso público", minutes: 30, tone: "visit", strong: true },
    { who: "", text: "Cântico da Sentinela", minutes: null, tone: "neutral", italic: true },
    { who: "", text: "Estudo de A Sentinela (abreviado)", minutes: 30, tone: "neutral" },
    { who: i.sc, text: i.weekend.finalTalk ?? "Discurso final", minutes: 30, tone: "visit", strong: true },
    { who: "", text: `${song(i.weekend.closingSong)} e oração final`, minutes: null, tone: "neutral", italic: true },
  ];
  const specials: BoardModel["specials"] = [];
  const pi = splitAt(i.pioneer?.at ?? null), el = splitAt(i.elders?.at ?? null);
  if (i.pioneer) specials.push({ time: pi ? `${pi.day.split("-")[0]} ${pi.time}` : "", text: "Reunião com Pioneiros", place: i.pioneer.place ?? "" });
  if (i.elders) specials.push({ time: el ? `${el.day.split("-")[0]} ${el.time}` : "", text: "Reunião com Anciãos e Servos", place: i.elders.place ?? "" });
  // Serviço de campo: quarta a domingo; manhã = período "manhã" ou horário antes do meio-dia.
  const start = d0(i.startDate);
  const field: BoardField[] = FIELD_DAYS.map((day, k) => {
    const d = new Date(start); d.setDate(d.getDate() + ((3 + k - start.getDay() + 7) % 7));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rows = i.field.filter((f) => f.date.slice(0, 10) === iso);
    const isAm = (f: BoardInput["field"][number]) => /manh|morn|mañ/i.test(f.period) || (!/tard|after/i.test(f.period) && !!f.time && f.time < "12:00");
    const pick = (list: BoardInput["field"]) => {
      const sorted = [...list].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
      const withPlace = sorted.filter((f) => f.place?.trim());
      const first = withPlace[0] ?? sorted[0];
      const places = [...new Set(withPlace.map((f) => f.place!.trim()))];
      return { time: first?.time?.slice(0, 5) ?? "", place: places.join(" / ") };
    };
    return { day, am: pick(rows.filter(isAm)), pm: pick(rows.filter((f) => !isAm(f))) };
  });
  return {
    range: formatRange(i.startDate, i.endDate), sc: i.sc, congregation: i.congregation,
    midweekWhen: mw ? `${mw.day} às ${mw.time}` : "Meio de semana", midweek,
    weekendWhen: we ? `${we.day} às ${we.time}` : "Fim de semana", weekend, specials, field,
  };
}

// Cores do quadro (RGB) — impresso, não segue o tema claro/escuro do app.
const C = { brand: [0, 122, 153], text: [30, 30, 30], muted: [110, 110, 110], line: [200, 205, 210], treasures: [54, 110, 125], ministry: [196, 132, 0], living: [170, 40, 30], visit: [0, 122, 153], neutral: [110, 110, 110] } as const;
type RGB = readonly [number, number, number];

export async function renderBoardPdf(m: BoardModel): Promise<Blob> {
  const pdf = await createJsPdfCompat({ unit: "mm" });
  const W = pdf.pageW, M = 12, colX = 70, rightX = colX + 6;
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const fit = (s: string, w: number) => { let t = s; while (t.length > 3 && pdf.measureText(t) > w) t = t.slice(0, -2); return t === s ? s : `${t.trimEnd()}…`; };

  // Faixa do topo
  fill(C.brand); pdf.rect(M, 10, W - 2 * M, 26, "F");
  ink([255, 255, 255]); pdf.setFont(true); pdf.setFontSize(14);
  const [r1, r2] = (() => { const k = m.range.lastIndexOf(" de "); return k > 0 ? [m.range.slice(0, k), m.range.slice(k + 1)] : [m.range, ""]; })();
  pdf.text(r1, colX - 4, 20, { align: "right" }); pdf.text(r2, colX - 4, 27, { align: "right" });
  pdf.setFontSize(22); pdf.text("SEMANA DA VISITA", rightX, 21);
  pdf.setFontSize(9); pdf.text("DO SUPERINTENDENTE DE CIRCUITO", rightX, 27);

  // Linha do tempo
  let y = 44;
  ink(C.muted); pdf.setFontSize(7); pdf.text("Congregação", colX - 4, y, { align: "right" });
  ink(C.brand); pdf.setFont(true); pdf.setFontSize(11); pdf.text(fit(m.congregation, colX - M - 4), colX - 4, y + 5, { align: "right" });
  pdf.setFontSize(14); pdf.text("PROGRAMAÇÃO DAS REUNIÕES", rightX, y + 4);
  pdf.setDrawColor(C.brand[0], C.brand[1], C.brand[2]); pdf.setLineWidth(0.4); pdf.line(rightX, y + 7, W - M, y + 7);
  const timelineTop = y + 10;
  y += 14;

  const block = (title: string, label: string, rows: BoardRow[], rowH: number) => {
    fill(C.brand); pdf.rect(colX - 1.6, y - 3.2, 3.2, 3.2, "F");
    ink(C.muted); pdf.setFont(true); pdf.setFontSize(9); pdf.text(label, colX - 4, y, { align: "right" });
    ink(C.brand); pdf.setFontSize(11); pdf.text(title, rightX, y);
    y += 6;
    let lastTone: BoardTone | null = null;
    for (const r of rows) {
      if (r.tone !== "neutral" && r.tone !== lastTone) { fill(C[r.tone]); pdf.rect(rightX, y - 3.4, W - M - rightX, 0.9, "F"); y += 1.6; }
      lastTone = r.tone;
      const c = C[r.tone] as RGB;
      if (r.who) { ink(c); pdf.setFont(true); pdf.setFontSize(8); pdf.text(fit(r.who, colX - M - 4), colX - 4, y, { align: "right" }); }
      fill(c); pdf.rect(rightX + 0.6, y - 1.9, 1.2, 1.2, "F");
      ink(c); pdf.setFont(!!r.strong); pdf.setFontSize(r.strong ? 9 : 8.5);
      let x = rightX + 4;
      if (r.minutes != null) { pdf.setFont(true); pdf.text(`${String(r.minutes).padStart(2, "0")}m`, x, y); x += 9; pdf.setFont(!!r.strong); }
      pdf.text(fit(r.text, W - M - x), x, y);
      y += rowH;
    }
    y += 2; pdf.setDrawColor(C.line[0], C.line[1], C.line[2]); pdf.setLineWidth(0.3); pdf.line(rightX, y - 2, W - M, y - 2); y += 4;
  };
  const rowH = Math.max(4.2, Math.min(5.2, 150 / Math.max(1, m.midweek.length + m.weekend.length)));
  block(`Reunião do Meio de Semana: ${m.midweekWhen}`, "Designações", m.midweek, rowH);
  block(`Reunião do Fim de Semana: ${m.weekendWhen}`, "Designações", m.weekend, rowH);
  if (m.specials.length) {
    fill(C.brand); pdf.rect(colX - 1.6, y - 3.2, 3.2, 3.2, "F");
    ink(C.muted); pdf.setFont(true); pdf.setFontSize(9); pdf.text("Dia e local", colX - 4, y, { align: "right" });
    ink(C.brand); pdf.setFontSize(11); pdf.text("Reuniões Especiais", rightX, y); y += 6;
    for (const s of m.specials) {
      ink(C.text); pdf.setFont(false); pdf.setFontSize(8); pdf.text(fit(s.place || "Local: ________", colX - M - 4), colX - 4, y, { align: "right" });
      pdf.setFont(true); pdf.setFontSize(9); pdf.text(`${s.time || "____"}  -  ${s.text}`, rightX + 4, y); y += 5.5;
    }
  }
  fill(C.brand); pdf.rect(colX - 0.4, timelineTop, 0.8, Math.max(10, y - timelineTop - 4), "F");

  // Serviço de campo (fixo no rodapé da página)
  const rows = m.field.length, rh = 6.6, top = Math.max(y + 4, pdf.pageH - 12 - 16 - rows * rh);
  const tw = W - 2 * M, cDay = 22, cT = 18, cP = (tw - cDay - 2 * cT) / 2;
  fill(C.brand); pdf.rect(M, top, tw, 8, "F");
  ink([255, 255, 255]); pdf.setFont(true); pdf.setFontSize(12); pdf.text("SERVIÇO DE CAMPO", W / 2, top + 5.6, { align: "center" });
  const hy = top + 8;
  pdf.setDrawColor(C.brand[0], C.brand[1], C.brand[2]); pdf.setLineWidth(0.4);
  pdf.rect(M, hy, tw, 8 + rows * rh, "S");
  ink(C.brand); pdf.setFontSize(8.5);
  pdf.text("Dia", M + cDay / 2, hy + 5.4, { align: "center" });
  pdf.text("Manhã", M + cDay + cT / 2, hy + 5.4, { align: "center" });
  pdf.text("Local", M + cDay + cT + cP / 2, hy + 5.4, { align: "center" });
  pdf.text("Tarde", M + cDay + cT + cP + cT / 2, hy + 5.4, { align: "center" });
  pdf.text("Local", M + cDay + 2 * cT + cP + cP / 2, hy + 5.4, { align: "center" });
  for (const x of [M + cDay, M + cDay + cT, M + cDay + cT + cP, M + cDay + 2 * cT + cP]) pdf.line(x, hy, x, hy + 8 + rows * rh);
  m.field.forEach((f, k) => {
    const ry = hy + 8 + k * rh;
    pdf.line(M, ry, M + tw, ry);
    ink(C.brand); pdf.setFont(true); pdf.text(f.day, M + cDay / 2, ry + 4.5, { align: "center" });
    ink(C.text); pdf.setFont(false);
    pdf.text(f.am.time, M + cDay + cT / 2, ry + 4.5, { align: "center" });
    pdf.text(fit(f.am.place, cP - 3), M + cDay + cT + 1.5, ry + 4.5);
    pdf.text(f.pm.time, M + cDay + cT + cP + cT / 2, ry + 4.5, { align: "center" });
    pdf.text(fit(f.pm.place, cP - 3), M + cDay + 2 * cT + cP + 1.5, ry + 4.5);
  });
  return pdf.output("blob");
}
