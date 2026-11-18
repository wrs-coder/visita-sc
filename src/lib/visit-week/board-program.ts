// "Programa da Semana da Visita" para o quadro de anúncios: uma página A4 (pdf-lib via createJsPdfCompat).
// Inspirado no quadro da congregação: faixa do topo, linha do tempo com designações à esquerda,
// faixas de cor por seção e tabela do serviço de campo. O que não existir no app sai em branco
// para preencher à mão. buildBoardModel é puro (testado); renderBoardPdf só desenha.
import type { MeetingPart } from "@/lib/meeting/meeting-store";
import { createJsPdfCompat } from "@/lib/pdf/pdf-engine";

export type BoardTone = "neutral" | "treasures" | "ministry" | "living" | "visit";
export interface BoardRow { who: string; text: string; minutes: number | null; tone: BoardTone; italic?: boolean; strong?: boolean; /** Início previsto "HH:MM" (só no meio de semana, igual ao controle de tempo). */ time?: string }
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
  midweek: {
    at: string | null; chairman: string | null; parts: MeetingPart[] | null; serviceTalk: string | null; finalSong: string | null;
    /** Hora de início do programa do controle de tempo ("HH:MM"); ausente = sem horário por parte. */
    start?: string | null;
    /** Id da parte que virou o discurso de serviço (applyVisitWeek). */
    visitTalkId?: string | null;
  };
  weekend: { at: string | null; chairman?: string | null; publicTalk: string | null; finalTalk: string | null; openingSong: string | null; closingSong: string | null };
  pioneer: { at: string | null; place: string | null } | null;
  elders: { at: string | null; place: string | null } | null;
  field: Array<{ date: string; period: string; time: string | null; place: string | null }>;
}

/** Frases opcionais do quadro (ligadas/desligadas no aparelho). */
export const BOARD_TOP_PHRASE = "“. . . Todos os seus filhos serão ensinados por Jeová . . .” — Isa. 54:13";
export const BOARD_BOTTOM_PHRASE =
  "Incentivamos todos a apoiarem ativamente o ministério, pois fomos escolhidos “para declarar boas novas de uma grande alegria que todo o povo terá” – Lucas 2:10.";
export interface BoardRenderOptions { topPhrase?: boolean; bottomPhrase?: boolean; issuedAt?: Date }

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const FIELD_DAYS = ["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const d0 = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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

/**
 * Programa do controle de tempo da semana da visita: primeiro o que tem o dia da reunião dentro
 * da visita; senão o da semana da apostila (segunda a domingo) que cruza a visita.
 */
export function pickVisitProgram<T extends { date: string; monday: string }>(list: T[], startDate: string, endDate: string): T | null {
  const a = startDate.slice(0, 10), b = endDate.slice(0, 10);
  const byDate = list.find((p) => p.date >= a && p.date <= b);
  if (byDate) return byDate;
  return list.find((p) => {
    const sun = d0(p.monday); sun.setDate(sun.getDate() + 6);
    return p.monday <= b && isoOf(sun) >= a;
  }) ?? null;
}

const toneOf = (p: MeetingPart): BoardTone => (p.section === "treasures" ? "treasures" : p.section === "ministry" ? "ministry" : p.section === "living" ? "living" : "neutral");
const song = (n: string | null) => (n && /\d/.test(n) ? `Cântico ${/(\d{1,3})/.exec(n)![1]}` : "Cântico ____");
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const addMin = (hm: string, n: number) => { const [h, m] = hm.split(":").map(Number); const t = h * 60 + m + n; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function buildBoardModel(i: BoardInput): BoardModel {
  const mw = splitAt(i.midweek.at), we = splitAt(i.weekend.at);
  const chair = i.midweek.chairman?.trim() ?? "";
  const midweek: BoardRow[] = [{ who: chair, text: "Presidência", minutes: null, tone: "neutral", strong: true }];
  if (i.midweek.parts?.length) {
    // Mesma lista e ordem do controle de tempo: cânticos, comentários, partes e conselhos.
    let clock = i.midweek.start && HM.test(i.midweek.start) ? i.midweek.start : null;
    for (const p of i.midweek.parts) {
      const isPrayerSong = p.kind === "song" && /ora[cç][aã]o/i.test(p.theme);
      const isVisitTalk = i.midweek.visitTalkId
        ? p.id === i.midweek.visitTalkId
        : !!p.assigned && p.assigned === i.sc && p.kind === "part" && p.section === "living" && p.minutes === 30;
      const who = p.kind === "song" && !isPrayerSong ? "" : p.kind === "comments" && p.assigned.trim() === chair ? "" : p.assigned;
      const time = clock ?? undefined;
      midweek.push({
        who, text: p.theme, minutes: p.kind === "song" ? null : p.minutes, time,
        tone: isVisitTalk || p.kind === "comments" ? "visit" : toneOf(p), italic: p.kind === "song", strong: isVisitTalk,
      });
      if (clock) clock = addMin(clock, p.minutes ?? 0);
      if (p.counsel) {
        midweek.push({ who: "", text: "Conselho", minutes: p.counsel, time: clock ?? undefined, tone: toneOf(p), italic: true });
        if (clock) clock = addMin(clock, p.counsel);
      }
    }
  } else {
    midweek.push({ who: "", text: "Cântico e oração inicial", minutes: null, tone: "neutral", italic: true });
    midweek.push({ who: "", text: "(Importe a apostila no controle de tempo da reunião)", minutes: null, tone: "neutral", italic: true });
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
    const iso = isoOf(d);
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
const C = {
  brand: [0, 122, 153], text: [30, 30, 30], muted: [110, 110, 110], line: [200, 205, 210], soft: [229, 241, 245], zebra: [245, 247, 249],
  treasures: [54, 110, 125], ministry: [196, 132, 0], living: [170, 40, 30], visit: [0, 122, 153], neutral: [110, 110, 110],
} as const;
type RGB = readonly [number, number, number];

export async function renderBoardPdf(m: BoardModel, opts: BoardRenderOptions = {}): Promise<Blob> {
  const showTop = opts.topPhrase ?? false, showBottom = opts.bottomPhrase ?? false;
  const pdf = await createJsPdfCompat({ unit: "mm" });
  const W = pdf.pageW, H = pdf.pageH, M = 12, colX = 70, rightX = colX + 6, bottom = H - 10;
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB, w: number) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const fit = (s: string, w: number) => { let t = s; while (t.length > 3 && pdf.measureText(t) > w) t = t.slice(0, -2); return t === s ? s : `${t.trimEnd()}…`; };

  // Faixa do topo
  fill(C.brand); pdf.rect(M, 10, W - 2 * M, 22, "F");
  ink([255, 255, 255]); pdf.setFont(true); pdf.setFontSize(14);
  const [r1, r2] = (() => { const k = m.range.lastIndexOf(" de "); return k > 0 ? [m.range.slice(0, k), m.range.slice(k + 1)] : [m.range, ""]; })();
  pdf.text(r1, colX - 4, 19, { align: "right" }); pdf.text(r2, colX - 4, 25.5, { align: "right" });
  pdf.setFontSize(22); pdf.text("SEMANA DA VISITA", rightX, 20);
  pdf.setFontSize(9); pdf.text("DO SUPERINTENDENTE DE CIRCUITO", rightX, 26);

  let y = 40;
  if (showTop) {
    ink(C.brand); pdf.setFont(false, true); pdf.setFontSize(10.5);
    pdf.text(fit(BOARD_TOP_PHRASE, W - 2 * M), W / 2, 39, { align: "center" });
    y = 47;
  }

  // Medidas para caber tudo em uma folha sem vão: as linhas se ajustam ao espaço livre.
  const blockCols = (rows: BoardRow[]) => ({ timeW: rows.some((r) => r.time) ? 10 : 0, minW: 9 });
  const wrapRow = (r: BoardRow, rows: BoardRow[]) => {
    const { timeW, minW } = blockCols(rows);
    pdf.setFont(!!r.strong, !!r.italic); pdf.setFontSize(r.strong ? 9 : 8.5);
    const lines = pdf.splitTextToSize(r.text, W - M - (rightX + 4 + timeW + minW));
    return lines.length > 2 ? [lines[0], fit(lines.slice(1).join(" "), W - M - (rightX + 4 + timeW + minW))] : lines;
  };
  const midLines = m.midweek.map((r) => wrapRow(r, m.midweek));
  const weLines = m.weekend.map((r) => wrapRow(r, m.weekend));
  const lineUnits = [...midLines, ...weLines].reduce((s, l) => s + 1 + (l.length - 1) * 0.8, 0);
  const toneBars = (rows: BoardRow[]) => { let n = 0, last: BoardTone | null = null; for (const r of rows) { if (r.tone !== "neutral" && r.tone !== last) n++; last = r.tone; } return n; };
  const fieldRows = m.field.length, rh = 6, fieldH = 8 + 7 + fieldRows * rh;
  pdf.setFont(false, true); pdf.setFontSize(9);
  const footLines = showBottom ? pdf.splitTextToSize(BOARD_BOTTOM_PHRASE, W - 2 * M - 24) : [];
  const footH = (showBottom ? 5 + footLines.length * 4.2 : 0) + 5;
  const specialsH = m.specials.length ? 3 + 6 + m.specials.length * 5.8 + 3 : 0;
  const fixed = (y + 12) + 2 * 10 + (toneBars(m.midweek) + toneBars(m.weekend)) * 1.6 + specialsH + 5 + fieldH + footH;
  const rowH = Math.max(3.8, Math.min(5.8, (bottom - fixed) / Math.max(1, lineUnits)));

  // Linha do tempo
  ink(C.muted); pdf.setFont(false); pdf.setFontSize(7); pdf.text("Congregação", colX - 4, y, { align: "right" });
  ink(C.brand); pdf.setFont(true); pdf.setFontSize(11); pdf.text(fit(m.congregation, colX - M - 4), colX - 4, y + 5, { align: "right" });
  pdf.setFontSize(14); pdf.text("PROGRAMAÇÃO DAS REUNIÕES", rightX, y + 4);
  stroke(C.brand, 0.4); pdf.line(rightX, y + 7, W - M, y + 7);
  const timelineTop = y + 9;
  y += 12;

  const marker = () => { fill(C.brand); pdf.rect(colX - 1.6, y - 3.2, 3.2, 3.2, "F"); };
  const block = (title: string, rows: BoardRow[], wrapped: string[][]) => {
    const { timeW, minW } = blockCols(rows);
    marker();
    ink(C.muted); pdf.setFont(true); pdf.setFontSize(9); pdf.text("Designações", colX - 4, y, { align: "right" });
    ink(C.brand); pdf.setFontSize(11); pdf.text(title, rightX, y);
    y += 5.5;
    let lastTone: BoardTone | null = null;
    rows.forEach((r, k) => {
      if (r.tone !== "neutral" && r.tone !== lastTone) { fill(C[r.tone]); pdf.rect(rightX, y - 3.4, W - M - rightX, 0.9, "F"); y += 1.6; }
      lastTone = r.tone;
      const c = C[r.tone] as RGB;
      if (r.who) { ink(c); pdf.setFont(true); pdf.setFontSize(8); pdf.text(fit(r.who, colX - M - 4), colX - 4, y, { align: "right" }); }
      fill(c); pdf.rect(rightX + 0.6, y - 1.9, 1.2, 1.2, "F");
      let x = rightX + 4;
      if (timeW) { ink(C.muted); pdf.setFont(false); pdf.setFontSize(7.5); if (r.time) pdf.text(r.time, x, y); x += timeW; }
      if (r.minutes != null) { ink(c); pdf.setFont(true); pdf.setFontSize(8.5); pdf.text(`${String(r.minutes).padStart(2, "0")}m`, x, y); }
      x += minW;
      ink(r.italic && r.tone === "neutral" ? C.muted : c); pdf.setFont(!!r.strong, !!r.italic); pdf.setFontSize(r.strong ? 9 : 8.5);
      const lines = wrapped[k];
      lines.forEach((ln, j) => { pdf.text(ln, x, y + j * rowH * 0.8); });
      y += rowH + (lines.length - 1) * rowH * 0.8;
    });
    y += 1.5; stroke(C.line, 0.3); pdf.line(rightX, y - 2, W - M, y - 2); y += 3;
  };
  block(`Reunião do Meio de Semana: ${m.midweekWhen}`, m.midweek, midLines);
  block(`Reunião do Fim de Semana: ${m.weekendWhen}`, m.weekend, weLines);

  if (m.specials.length) {
    marker();
    ink(C.muted); pdf.setFont(true); pdf.setFontSize(9); pdf.text("Dia e local", colX - 4, y, { align: "right" });
    ink(C.brand); pdf.setFontSize(11); pdf.text("Reuniões Especiais", rightX, y); y += 3;
    // Cartão com borda fina: Horário | Reunião | Local
    const cw = W - M - rightX, cT = 26, cL = 44, cR = cw - cT - cL, top = y, hh = 6, rr = 5.8;
    fill(C.soft); pdf.rect(rightX, top, cw, hh, "F");
    ink(C.brand); pdf.setFont(true); pdf.setFontSize(8);
    pdf.text("Horário", rightX + 3, top + 4.1); pdf.text("Reunião", rightX + cT + 3, top + 4.1); pdf.text("Local", rightX + cT + cR + 3, top + 4.1);
    m.specials.forEach((s, k) => {
      const ry = top + hh + k * rr;
      if (k) { stroke(C.line, 0.2); pdf.line(rightX + 2, ry, rightX + cw - 2, ry); }
      ink(C.text); pdf.setFont(true); pdf.setFontSize(8.5); pdf.text(s.time || "____", rightX + 3, ry + 4);
      pdf.setFont(false); pdf.text(fit(s.text, cR - 5), rightX + cT + 3, ry + 4);
      pdf.text(fit(s.place || "________", cL - 5), rightX + cT + cR + 3, ry + 4);
    });
    const ch = hh + m.specials.length * rr;
    stroke(C.brand, 0.3); pdf.rect(rightX, top, cw, ch, "S");
    y = top + ch + 3;
  }
  fill(C.brand); pdf.rect(colX - 0.4, timelineTop, 0.8, Math.max(10, y - timelineTop - 4), "F");

  // Serviço de campo: logo após as reuniões especiais (sem vão no meio da folha).
  let top = y + 5;
  if (top + fieldH + footH > H - 6) { pdf.addPage(); top = 14; }
  const tw = W - 2 * M, cDay = 22, cT = 18, cP = (tw - cDay - 2 * cT) / 2;
  fill(C.brand); pdf.rect(M, top, tw, 8, "F");
  ink([255, 255, 255]); pdf.setFont(true); pdf.setFontSize(12); pdf.text("SERVIÇO DE CAMPO", W / 2, top + 5.6, { align: "center" });
  const hy = top + 8;
  fill(C.soft); pdf.rect(M, hy, tw, 7, "F");
  m.field.forEach((_, k) => { if (k % 2 === 1) { fill(C.zebra); pdf.rect(M, hy + 7 + k * rh, tw, rh, "F"); } });
  stroke(C.brand, 0.4);
  pdf.rect(M, hy, tw, 7 + fieldRows * rh, "S");
  ink(C.brand); pdf.setFontSize(8.5);
  pdf.text("Dia", M + cDay / 2, hy + 4.8, { align: "center" });
  pdf.text("Manhã", M + cDay + cT / 2, hy + 4.8, { align: "center" });
  pdf.text("Local", M + cDay + cT + cP / 2, hy + 4.8, { align: "center" });
  pdf.text("Tarde", M + cDay + cT + cP + cT / 2, hy + 4.8, { align: "center" });
  pdf.text("Local", M + cDay + 2 * cT + cP + cP / 2, hy + 4.8, { align: "center" });
  stroke(C.line, 0.25);
  for (const x of [M + cDay, M + cDay + cT, M + cDay + cT + cP, M + cDay + 2 * cT + cP]) pdf.line(x, hy, x, hy + 7 + fieldRows * rh);
  m.field.forEach((f, k) => {
    const ry = hy + 7 + k * rh;
    pdf.line(M, ry, M + tw, ry);
    ink(C.brand); pdf.setFont(true); pdf.setFontSize(8.5); pdf.text(f.day, M + cDay / 2, ry + 4.2, { align: "center" });
    ink(C.text); pdf.setFont(false);
    pdf.text(f.am.time, M + cDay + cT / 2, ry + 4.2, { align: "center" });
    pdf.text(fit(f.am.place, cP - 3), M + cDay + cT + 1.5, ry + 4.2);
    pdf.text(f.pm.time, M + cDay + cT + cP + cT / 2, ry + 4.2, { align: "center" });
    pdf.text(fit(f.pm.place, cP - 3), M + cDay + 2 * cT + cP + 1.5, ry + 4.2);
  });
  y = hy + 7 + fieldRows * rh;

  // Rodapé: frase de incentivo (opcional) e data de emissão.
  if (showBottom) {
    y += 5;
    stroke(C.brand, 0.3); pdf.line(W / 2 - 30, y - 3, W / 2 + 30, y - 3);
    ink(C.text); pdf.setFont(false, true); pdf.setFontSize(9);
    footLines.forEach((ln) => { y += 4.2; pdf.text(ln, W / 2, y, { align: "center" }); });
  }
  const d = opts.issuedAt ?? new Date();
  ink(C.muted); pdf.setFont(false); pdf.setFontSize(7);
  pdf.text(`Emitido em ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`, W - M, Math.min(y + 5, H - 5), { align: "right" });
  return pdf.output("blob");
}
