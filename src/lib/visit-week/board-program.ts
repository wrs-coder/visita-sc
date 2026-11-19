// "Programa da Semana da Visita" para o quadro de anúncios: uma página A4 (pdf-lib via createJsPdfCompat).
// Inspirado no quadro da congregação: faixa do topo, linha do tempo com designações à esquerda,
// faixas de cor por seção e tabela do serviço de campo. O que não existir no app sai em branco
// para preencher à mão. buildBoardModel é puro (testado); renderBoardPdf só desenha.
import type { MeetingPart } from "@/lib/meeting/meeting-store";
import { createJsPdfCompat } from "@/lib/pdf/pdf-engine";

export type BoardTone = "neutral" | "treasures" | "ministry" | "living" | "visit";
export interface BoardRow { who: string; text: string; minutes: number | null; tone: BoardTone; italic?: boolean; strong?: boolean; /** Início previsto "HH:MM" (só no meio de semana, igual ao controle de tempo). */ time?: string }
export interface BoardField { day: string; am: { time: string; place: string }; pm: { time: string; place: string }; prayer?: string }
/** Uma saída de campo (tabela detalhada: dia, horário, local, modalidade, território e oração). */
export interface BoardFieldItem { day: string; time: string; place: string; modality: string; territory: string; prayer: string; am: boolean }
export interface BoardSpecialDetail { title: string; place: string; when: string; theme: string; opening: string; closing: string }
export interface BoardModel {
  range: string; sc: string; congregation: string;
  midweekWhen: string; midweek: BoardRow[];
  /** Leitura semanal da Bíblia ("Lamentações 1 a 2") e presidente do meio de semana. */
  reading: string; chairman: string;
  weekendWhen: string; weekend: BoardRow[];
  specials: Array<{ time: string; text: string; place: string; theme?: string; prayers?: string }>;
  field: BoardField[];
  /** Todas as saídas de campo, por data e horário. */
  fieldDetail: BoardFieldItem[];
  /** Modelo simplificado. */
  serviceTalk: string; publicTalk: string; finalTalk: string;
  songs: { midFinal: string; weOpen: string; weClose: string };
  specialsDetail: BoardSpecialDetail[];
}

export interface BoardInput {
  startDate: string; endDate: string; sc: string; congregation: string;
  midweek: {
    at: string | null; chairman: string | null; parts: MeetingPart[] | null; serviceTalk: string | null; finalSong: string | null;
    /** Hora de início do programa do controle de tempo ("HH:MM"); ausente = sem horário por parte. */
    start?: string | null;
    /** Id da parte que virou o discurso de serviço (applyVisitWeek). */
    visitTalkId?: string | null;
    /** Título da semana na apostila (leitura da Bíblia). */
    reading?: string | null;
  };
  weekend: { at: string | null; chairman?: string | null; publicTalk: string | null; finalTalk: string | null; openingSong: string | null; closingSong: string | null };
  pioneer: { at: string | null; place: string | null; theme?: string | null; opening?: string | null; closing?: string | null } | null;
  elders: { at: string | null; place: string | null; theme?: string | null; opening?: string | null; closing?: string | null } | null;
  field: Array<{ date: string; period: string; time: string | null; place: string | null; prayer?: string | null; modality?: string | null; territory?: string | null }>;
}

/** Frases opcionais do quadro (ligadas/desligadas no aparelho). */
export const BOARD_TOP_PHRASE = "“. . . Todos os seus filhos serão ensinados por Jeová . . .” — Isa. 54:13";
export const BOARD_BOTTOM_PHRASE =
  "Incentivamos todos a apoiarem ativamente o ministério de campo, pois fomos escolhidos “para declarar as boas novas de uma grande alegria” – Lucas 2:10.";
export type BoardTemplate = "full" | "simple";
export interface BoardRenderOptions { topPhrase?: boolean; bottomPhrase?: boolean; issuedAt?: Date; template?: BoardTemplate; fieldDetailed?: boolean }
const MODALITY: Record<string, string> = {
  casa_em_casa: "Casa em casa", estudos_revisitas: "Estudos e revisitas", telefone: "Telefone", cartas: "Cartas",
  telefone_cartas: "Telefone e cartas", grupo_de_campo: "Grupo de campo",
};
/** Itens opcionais lidos do Programa da visita (desligados = não entram no quadro). */
export interface BoardContentOptions { specialThemes?: boolean; specialPrayers?: boolean; fieldPrayer?: boolean }

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const FIELD_DAYS = ["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const d0 = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "| LAMENTAÇÕES 1-2" → "Lamentações 1 a 2". */
export function formatReading(t: string | null | undefined): string {
  const s = (t ?? "").replace(/^[\s|\-–—:]+/, "").trim();
  if (!s) return "";
  const low = s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s;
  return low.replace(/(\d+)\s*[-–]\s*(\d+)/g, "$1 a $2");
}

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

export function buildBoardModel(i: BoardInput, o: BoardContentOptions = {}): BoardModel {
  const mw = splitAt(i.midweek.at), we = splitAt(i.weekend.at);
  const chair = i.midweek.chairman?.trim() ?? "";
  // O presidente aparece no cabeçalho do meio de semana; comentários iniciais/finais saem sem nome.
  const midweek: BoardRow[] = [];
  if (i.midweek.parts?.length) {
    // Mesma lista e ordem do controle de tempo: cânticos, comentários, partes e conselhos.
    let clock = i.midweek.start && HM.test(i.midweek.start) ? i.midweek.start : null;
    for (const p of i.midweek.parts) {
      const isPrayerSong = p.kind === "song" && /ora[cç][aã]o/i.test(p.theme);
      const isVisitTalk = i.midweek.visitTalkId
        ? p.id === i.midweek.visitTalkId
        : !!p.assigned && p.assigned === i.sc && p.kind === "part" && p.section === "living" && p.minutes === 30;
      const who = p.kind === "song" && !isPrayerSong ? "" : p.kind === "comments" ? "" : p.assigned;
      const time = clock ?? undefined;
      midweek.push({
        who, text: p.theme, minutes: p.kind === "song" ? null : p.minutes, time,
        tone: isVisitTalk || p.kind === "comments" ? "visit" : toneOf(p), italic: p.kind === "song", strong: isVisitTalk,
      });
      if (clock) clock = addMin(clock, p.minutes ?? 0);
      // Conselho não vai para o quadro, mas o tempo dele conta para os horários seguintes.
      if (p.counsel && clock) clock = addMin(clock, p.counsel);
    }
  } else {
    midweek.push({ who: "", text: "Cântico e oração inicial", minutes: null, tone: "neutral", italic: true });
    midweek.push({ who: "", text: "(Importe a apostila no controle de tempo da reunião)", minutes: null, tone: "neutral", italic: true });
    midweek.push({ who: i.sc, text: i.midweek.serviceTalk ?? "Discurso de serviço", minutes: 30, tone: "visit", strong: true });
    midweek.push({ who: "", text: `${song(i.midweek.finalSong)} e oração final`, minutes: null, tone: "neutral", italic: true });
  }
  // Fim de semana: só horários e temas, sem nomes (modelo completo).
  const weekend: BoardRow[] = [
    { who: "", text: `${song(i.weekend.openingSong)} e oração inicial`, minutes: null, tone: "neutral", italic: true },
    { who: "", text: i.weekend.publicTalk ?? "Discurso público", minutes: 30, tone: "visit", strong: true },
    { who: "", text: "Cântico da Sentinela", minutes: null, tone: "neutral", italic: true },
    { who: "", text: "Estudo de A Sentinela (abreviado)", minutes: 30, tone: "neutral" },
    { who: "", text: i.weekend.finalTalk ?? "Discurso final", minutes: 30, tone: "visit", strong: true },
    { who: "", text: `${song(i.weekend.closingSong)} e oração final`, minutes: null, tone: "neutral", italic: true },
  ];
  // Horário de cada item do fim de semana a partir do início da reunião.
  if (we && HM.test(we.time)) {
    let t = we.time;
    for (const [j, step] of [5, 30, 5, 30, 30, 0].entries()) { if (weekend[j]) weekend[j].time = t; t = addMin(t, step); }
  }
  const specials: BoardModel["specials"] = [];
  const pi = splitAt(i.pioneer?.at ?? null), el = splitAt(i.elders?.at ?? null);
  const extra = (x: NonNullable<BoardInput["pioneer"]>) => {
    const theme = o.specialThemes && x.theme?.trim() ? x.theme.trim() : undefined;
    const pr = [x.opening?.trim() ? `inicial: ${x.opening.trim()}` : "", x.closing?.trim() ? `final: ${x.closing.trim()}` : ""].filter(Boolean).join(" · ");
    return { theme, prayers: o.specialPrayers && pr ? `Oração ${pr}` : undefined };
  };
  if (i.pioneer) specials.push({ time: pi ? `${pi.day.split("-")[0]} ${pi.time}` : "", text: "Reunião com Pioneiros", place: i.pioneer.place ?? "", ...extra(i.pioneer) });
  if (i.elders) specials.push({ time: el ? `${el.day.split("-")[0]} ${el.time}` : "", text: "Reunião com Anciãos e Servos", place: i.elders.place ?? "", ...extra(i.elders) });
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
    const prayers = o.fieldPrayer ? [...new Set(rows.map((f) => f.prayer?.trim()).filter((x): x is string => !!x))] : [];
    return { day, am: pick(rows.filter(isAm)), pm: pick(rows.filter((f) => !isAm(f))), ...(prayers.length ? { prayer: prayers.join(" / ") } : {}) };
  });
  const isAmAny = (f: BoardInput["field"][number]) => /manh|morn|mañ/i.test(f.period) || (!/tard|after/i.test(f.period) && !!f.time && f.time < "12:00");
  const fieldDetail: BoardFieldItem[] = [...i.field]
    .filter((f) => f.date)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"))
    .map((f) => ({
      day: WEEKDAYS[d0(f.date).getDay()], time: f.time?.slice(0, 5) ?? "", place: f.place?.trim() ?? "",
      modality: f.modality ? (MODALITY[f.modality] ?? f.modality) : "", territory: f.territory?.trim() ?? "",
      prayer: o.fieldPrayer ? (f.prayer?.trim() ?? "") : "", am: isAmAny(f),
    }));
  const num = (v: string | null) => /(\d{1,3})/.exec(v ?? "")?.[1] ?? "";
  const detail = (title: string, x: BoardInput["pioneer"], at: ReturnType<typeof splitAt>): BoardSpecialDetail | null => x ? ({
    title, place: x.place?.trim() ?? "", when: at ? `${at.day}, ${at.time}` : "", theme: x.theme?.trim() ?? "",
    opening: x.opening?.trim() ?? "", closing: x.closing?.trim() ?? "",
  }) : null;
  const specialsDetail = [detail("Reunião com Pioneiros", i.pioneer, pi), detail("Reunião com Anciãos e Servos", i.elders, el)].filter((x): x is BoardSpecialDetail => !!x);
  return {
    fieldDetail, specialsDetail,
    serviceTalk: i.midweek.serviceTalk?.trim() ?? "", publicTalk: i.weekend.publicTalk?.trim() ?? "", finalTalk: i.weekend.finalTalk?.trim() ?? "",
    songs: { midFinal: num(i.midweek.finalSong), weOpen: num(i.weekend.openingSong), weClose: num(i.weekend.closingSong) },
    range: formatRange(i.startDate, i.endDate), sc: i.sc, congregation: i.congregation,
    reading: formatReading(i.midweek.reading), chairman: chair,
    midweekWhen: mw ? `${mw.day} às ${mw.time}` : "Meio de semana", midweek,
    weekendWhen: we ? `${we.day} às ${we.time}` : "Fim de semana", weekend, specials, field,
  };
}

// Cores do quadro (RGB) — impresso, não segue o tema claro/escuro do app.
const C = {
  brand: [0, 122, 153], text: [30, 30, 30], muted: [110, 110, 110], line: [200, 205, 210], soft: [229, 241, 245], zebra: [245, 247, 249],
  light: [126, 200, 227], treasures: [54, 110, 125], ministry: [196, 132, 0], living: [170, 40, 30], visit: [0, 122, 153], neutral: [110, 110, 110],
} as const;
type RGB = readonly [number, number, number];
type Pdf = Awaited<ReturnType<typeof createJsPdfCompat>>;

// ---- Tabela detalhada do serviço de campo (Modelo 2), usada nos dois modelos ----
const FD = { band: 8, sub: 6, head: 6, line: 4.2, pad: 1.8, gap: 2 };
function fieldGroups(items: BoardFieldItem[]) {
  return [{ title: "PERÍODO DA MANHÃ", rows: items.filter((f) => f.am) }, { title: "PERÍODO DA TARDE", rows: items.filter((f) => !f.am) }].filter((g) => g.rows.length);
}
export function fieldDetailHeight(items: BoardFieldItem[], k: number): number {
  const gs = fieldGroups(items);
  if (!gs.length) return 2 + FD.band * k + 8 * k;
  return 2 + FD.band * k + gs.reduce((t, g) => t + (FD.sub + FD.head) * k + g.rows.length * (2 * FD.line + FD.pad) * k + FD.gap, 0);
}
function drawFieldDetail(pdf: Pdf, items: BoardFieldItem[], top: number, k: number, M: number, W: number, title: string, light = false): number {
  const tw = W - 2 * M, F = (n: number) => pdf.setFontSize(n * k);
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB, w: number) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const fit = (t0: string, w: number) => { let t = t0; while (t.length > 3 && pdf.measureText(t) > w) t = t.slice(0, -2); return t === t0 ? t0 : `${t.trimEnd()}…`; };
  let y = top + 2;
  fill(light ? C.light : C.brand); pdf.rect(M, y, tw, FD.band * k, "F");
  ink(light ? C.text : [255, 255, 255]); pdf.setFont(true); F(12); pdf.text(title, W / 2, y + 5.6 * k, { align: "center" });
  y += FD.band * k;
  const gs = fieldGroups(items);
  if (!gs.length) { ink(C.muted); pdf.setFont(false, true); F(8.5); pdf.text("Nenhuma saída de campo cadastrada no Programa da visita.", W / 2, y + 5 * k, { align: "center" }); return y + 8 * k; }
  const half = tw * 0.46;
  for (const g of gs) {
    fill(C.soft); pdf.rect(M, y, tw, FD.sub * k, "F");
    ink(C.text); pdf.setFont(true); F(8.5); pdf.text(g.title, W / 2, y + 4.2 * k, { align: "center" });
    y += FD.sub * k;
    const boxTop = y;
    ink(C.brand); pdf.setFont(true); F(8.5);
    pdf.text("Dia, horário e local", M + half / 2, y + 4.2 * k, { align: "center" });
    pdf.text("Informações adicionais", M + half + (tw - half) / 2, y + 4.2 * k, { align: "center" });
    y += FD.head * k;
    g.rows.forEach((f, j) => {
      const h = (2 * FD.line + FD.pad) * k;
      if (j % 2 === 1) { fill(C.zebra); pdf.rect(M, y, tw, h, "F"); }
      stroke(C.line, 0.2); pdf.line(M, y, M + tw, y);
      const l1 = y + FD.line * k, l2 = l1 + FD.line * k;
      ink(C.brand); pdf.setFont(true); F(8.5);
      const dayTxt = `${f.day}${f.time ? ` · ${f.time}` : ""}`;
      pdf.text(fit(dayTxt, half - 4), M + 2, l1);
      ink(C.text); pdf.setFont(false); F(8.5);
      pdf.text(fit(`Local: ${f.place || "________"}`, half - 4), M + 2, l2);
      const info1 = [f.modality && `Modalidade: ${f.modality}`, f.territory && `Território: Nº ${f.territory}`].filter(Boolean).join(" · ");
      pdf.text(fit(info1 || "Modalidade: ________", tw - half - 4), M + half + 2, l1);
      if (f.prayer) pdf.text(fit(`Oração: ${f.prayer}`, tw - half - 4), M + half + 2, l2);
      y += h;
    });
    stroke(C.brand, 0.4); pdf.rect(M, boxTop, tw, y - boxTop, "S");
    stroke(C.line, 0.25); pdf.line(M + half, boxTop, M + half, y);
    y += FD.gap;
  }
  return y;
}

export async function renderBoardPdf(m: BoardModel, opts: BoardRenderOptions = {}): Promise<Blob> {
  if (opts.template === "simple") return renderSimpleBoardPdf(m, opts);
  const detailed = !!opts.fieldDetailed;
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
  if (m.congregation) {
    pdf.setFont(false); pdf.setFontSize(7); pdf.text("Congregação", W - M - 4, 17, { align: "right" });
    pdf.setFont(true);
    let fs = 11; pdf.setFontSize(fs);
    while (fs > 7 && pdf.measureText(m.congregation) > W - M - 4 - (rightX + 82)) pdf.setFontSize(fs -= 0.5);
    pdf.text(fit(m.congregation, W - M - 4 - (rightX + 82)), W - M - 4, 23.5, { align: "right" });
  }

  const yTop = showTop ? 47 : 40;
  if (showTop) {
    ink(C.brand); pdf.setFont(false, true); pdf.setFontSize(10.5);
    pdf.text(fit(BOARD_TOP_PHRASE, W - 2 * M), W / 2, 39, { align: "center" });
  }
  const tw = W - 2 * M;
  const hasPrayer = m.field.some((f) => f.prayer);
  pdf.setFont(false, true); pdf.setFontSize(9);
  const footLines = showBottom ? pdf.splitTextToSize(BOARD_BOTTOM_PHRASE, W - 2 * M - 24) : [];
  const footH = (showBottom ? 5 + footLines.length * 4.2 : 0) + 5;
  const toneBars = (rows: BoardRow[]) => { let n = 0, last: BoardTone | null = null; for (const r of rows) { if (r.tone !== "neutral" && r.tone !== last) n++; last = r.tone; } return n; };

  // Coluna central (Modelo 1): quadradinho, horário, minutos, parte ........ designado.
  const L0 = M + 30, nameX = W - M - 44, R0 = W - M - 4;
  const sw = tw * 0.74, sx = (W - sw) / 2;
  // Sempre uma folha: reduz espaços e letras em passos de 5% (mínimo 70%) até caber.
  const plan = (s: number) => {
    const blockCols = (rows: BoardRow[]) => ({ timeW: rows.some((r) => r.time) ? 11 * s : 0, minW: 10 * s });
    const textW = (r: BoardRow, rows: BoardRow[]) => { const { timeW, minW } = blockCols(rows); return (r.who ? nameX - 3 : R0) - (L0 + 5 + timeW + minW); };
    const wrap = (r: BoardRow, rows: BoardRow[]) => {
      pdf.setFont(!!r.strong, !!r.italic); pdf.setFontSize((r.strong ? 9.5 : 9) * s);
      const w = textW(r, rows);
      const lines = pdf.splitTextToSize(r.text, w);
      return lines.length > 2 ? [lines[0], fit(lines.slice(1).join(" "), w)] : lines;
    };
    const midLines = m.midweek.map((r) => wrap(r, m.midweek));
    const weLines = m.weekend.map((r) => wrap(r, m.weekend));
    const units = [...midLines, ...weLines].reduce((t, l) => t + 1 + (l.length - 1) * 0.8, 0);
    const specRows = m.specials.map((sp) => Math.max(2, 1 + (sp.theme ? 1 : 0) + (sp.prayers ? 1 : 0)));
    const specialsH = m.specials.length ? 5 + 8 * s + 6 * s + specRows.reduce((t, n) => t + (n * 4.2 + 1.8) * s, 0) + 2 : 0;
    const rh = 6 * s, fieldH = detailed ? fieldDetailHeight(m.fieldDetail, s) + 2 : 5 + 8 * s + 7 * s + m.field.length * rh;
    const heads = 12 + (7 + 5.5 + 3) * s + 9 * s + 7 * s + 4 * s;
    const fixed = yTop + heads + (toneBars(m.midweek) + toneBars(m.weekend)) * 1.8 * s + specialsH + fieldH + footH;
    const free = (bottom - fixed) / Math.max(1, units);
    return { s, blockCols, midLines, weLines, specRows, rh, rowH: Math.min(5.8, free), ok: free >= 3.8 * s };
  };
  let L = plan(1);
  for (let s = 0.95; !L.ok && s >= 0.7 - 1e-9; s -= 0.05) L = plan(s);
  const { s: k, blockCols, midLines, weLines, specRows, rh } = L;
  const rowH = Math.max(L.rowH, 3.0 * k);
  const F = (n: number) => pdf.setFontSize(n * k);

  let y = yTop;
  ink(C.brand); pdf.setFont(true); F(15); pdf.text("PROGRAMAÇÃO DAS REUNIÕES", W / 2, y + 4, { align: "center" });
  y += 12;
  stroke(C.brand, 0.3); pdf.line(L0, y - 3.5, nameX + 4, y - 3.5);

  const dots = (x0: number, x1: number, yy: number) => {
    const dw = pdf.measureText(".");
    if (dw <= 0 || x1 - x0 < dw * 3) return;
    pdf.text(".".repeat(Math.floor((x1 - x0) / dw)), x0, yy);
  };
  const block = (title: string, rows: BoardRow[], wrapped: string[][], head?: () => void) => {
    const { timeW, minW } = blockCols(rows);
    ink(C.brand); pdf.setFont(true); F(11.5); pdf.text(fit(title, R0 - L0), (L0 + nameX + 4) / 2, y, { align: "center" });
    y += 6 * k;
    if (head) { head(); y += 5.5 * k; }
    let lastTone: BoardTone | null = null;
    rows.forEach((r, j0) => {
      if (r.tone !== "neutral" && r.tone !== lastTone) { fill(C[r.tone]); pdf.rect(L0, y - 3.6 * k, nameX + 4 - L0, 0.9 * k, "F"); y += 1.8 * k; }
      lastTone = r.tone;
      const c = C[r.tone] as RGB;
      fill(r.italic && r.tone === "neutral" ? C.muted : c); pdf.rect(L0 + 0.6, y - 1.9 * k, 1.2 * k, 1.2 * k, "F");
      let x = L0 + 5;
      if (timeW) { ink(C.muted); pdf.setFont(false); F(7.5); if (r.time) pdf.text(r.time, x, y); x += timeW; }
      if (r.minutes != null) { ink(c); pdf.setFont(true); F(8.5); pdf.text(`${String(r.minutes).padStart(2, "0")}m`, x, y); }
      x += minW;
      const txt = r.italic && r.tone === "neutral" ? C.muted : c;
      ink(txt); pdf.setFont(!!r.strong, !!r.italic); F(r.strong ? 9.5 : 9);
      const lines = wrapped[j0];
      lines.forEach((ln, j) => { pdf.text(ln, x, y + j * rowH * 0.8); });
      if (r.who) {
        const ly = y + (lines.length - 1) * rowH * 0.8;
        pdf.setFont(false, !!r.italic); F(r.strong ? 9.5 : 9);
        const end = x + pdf.measureText(lines[lines.length - 1] ?? "") + 1;
        ink(C.muted); dots(end, nameX - 2, ly);
        ink(r.italic && r.tone === "neutral" ? C.muted : c); pdf.setFont(true); F(8.5);
        pdf.text(fit(r.who, R0 + 4 - nameX), nameX, ly);
      }
      y += rowH + (lines.length - 1) * rowH * 0.8;
    });
  };
  block(`Reunião do Meio de Semana: ${m.midweekWhen}`, m.midweek, midLines, () => {
    ink(C.brand); pdf.setFont(true); F(9);
    const lab = "LEITURA SEMANAL DA BÍBLIA";
    pdf.text(lab, L0, y);
    const lw = pdf.measureText(lab);
    pdf.setFont(false); ink(C.text);
    const rd = fit(m.reading || "________", R0 - L0 - lw - 45);
    pdf.text(rd, L0 + lw + 3, y);
    const mid = L0 + lw + 3 + pdf.measureText(rd) + 8;
    pdf.setFont(true);
    ink(C.brand); pdf.setFont(true); pdf.text("Presidente:", mid, y);
    pdf.setFont(true);
    const pw = pdf.measureText("Presidente: ");
    ink(C.text); pdf.text(fit(m.chairman || "________", R0 + 4 - mid - pw), mid + pw, y);
  });
  // Linha que separa as duas reuniões, com quadradinhos nas pontas.
  y += 1.5 * k;
  const sx0 = M, sx1 = W - M;
  fill(C.brand); pdf.rect(sx0, y - 0.45, sx1 - sx0, 0.9, "F");
  pdf.rect(sx0, y - 1.6, 3.2, 3.2, "F"); pdf.rect(sx1 - 3.2, y - 1.6, 3.2, 3.2, "F");
  y += 7 * k;
  block(`Reunião do Fim de Semana: ${m.weekendWhen}`, m.weekend, weLines);
  y += 1 * k; stroke(C.line, 0.3); pdf.line(L0, y, W - M, y); y += 2 * k;

  // Faixa de título de tópico (largura total), igual ao Serviço de Campo.
  const band = (title: string, top: number) => {
    fill(C.brand); pdf.rect(M, top, tw, 8 * k, "F");
    ink([255, 255, 255]); pdf.setFont(true); F(12); pdf.text(title, W / 2, top + 5.6 * k, { align: "center" });
    return top + 8 * k;
  };

  // Reuniões Especiais (Modelo 1): Horário e Local | Reunião, em quadro centralizado.
  if (m.specials.length) {
    const hy = band("REUNIÕES ESPECIAIS", y + 2);
    const c1 = sw * 0.42, hh = 6 * k;
    fill(C.soft); pdf.rect(M, hy, tw, hh, "F");
    ink(C.brand); pdf.setFont(true); F(8.5);
    pdf.text("Horário e Local", sx + 3, hy + 4.1 * k); pdf.text("Reunião", sx + c1 + 3, hy + 4.1 * k);
    let ry = hy + hh;
    m.specials.forEach((sp, j) => {
      const h = (specRows[j] * 4.2 + 1.8) * k;
      if (j % 2 === 1) { fill(C.zebra); pdf.rect(sx, ry, sw, h, "F"); }
      stroke(C.line, 0.2); pdf.line(sx, ry, sx + sw, ry);
      const ty = ry + 4.2 * k;
      ink(C.brand); pdf.setFont(true); F(8.5); pdf.text(fit(sp.time || "____", c1 - 6), sx + 3, ty);
      ink(C.text); pdf.setFont(false); pdf.text(fit(sp.place || "________", c1 - 6), sx + 3, ty + 4.2 * k);
      let ly = ty;
      pdf.setFont(true); pdf.text(fit(sp.text, sw - c1 - 5), sx + c1 + 3, ly);
      if (sp.theme) { ly += 4.2 * k; pdf.setFont(false, true); F(8); pdf.text(fit(`“${sp.theme}”`, sw - c1 - 5), sx + c1 + 3, ly); }
      if (sp.prayers) { ly += 4.2 * k; ink(C.muted); pdf.setFont(false); F(7.5); pdf.text(fit(sp.prayers, sw - c1 - 5), sx + c1 + 3, ly); }
      ry += h;
    });
    stroke(C.line, 0.2); pdf.line(sx, ry, sx + sw, ry);
    y = ry + 3;
  }

  // Serviço de campo: logo depois, sempre na mesma folha.
  if (detailed) {
    y = drawFieldDetail(pdf, m.fieldDetail, y, k, M, W, "REUNIÕES PARA O SERVIÇO DE CAMPO");
  } else {
  const hy = band("REUNIÕES PARA O SERVIÇO DE CAMPO", y + 2);
  const fieldRows = m.field.length;
  const cDay = 22, cT = 18, cO = hasPrayer ? 34 : 0, cP = (tw - cDay - 2 * cT - cO) / 2;
  fill(C.soft); pdf.rect(M, hy, tw, 7 * k, "F");
  m.field.forEach((_, j) => { if (j % 2 === 1) { fill(C.zebra); pdf.rect(M, hy + 7 * k + j * rh, tw, rh, "F"); } });
  stroke(C.brand, 0.4);
  pdf.rect(M, hy, tw, 7 * k + fieldRows * rh, "S");
  ink(C.brand); pdf.setFont(true); F(8.5);
  const hT = hy + 4.8 * k;
  pdf.text("Dia", M + cDay / 2, hT, { align: "center" });
  pdf.text("Manhã", M + cDay + cT / 2, hT, { align: "center" });
  pdf.text("Local", M + cDay + cT + cP / 2, hT, { align: "center" });
  pdf.text("Tarde", M + cDay + cT + cP + cT / 2, hT, { align: "center" });
  pdf.text("Local", M + cDay + 2 * cT + cP + cP / 2, hT, { align: "center" });
  if (hasPrayer) pdf.text("Oração", M + tw - cO / 2, hT, { align: "center" });
  stroke(C.line, 0.25);
  const cols = [M + cDay, M + cDay + cT, M + cDay + cT + cP, M + cDay + 2 * cT + cP];
  if (hasPrayer) cols.push(M + tw - cO);
  for (const x of cols) pdf.line(x, hy, x, hy + 7 * k + fieldRows * rh);
  m.field.forEach((f, j) => {
    const ry = hy + 7 * k + j * rh, ty = ry + 4.2 * k;
    pdf.line(M, ry, M + tw, ry);
    ink(C.brand); pdf.setFont(true); F(8.5); pdf.text(f.day, M + cDay / 2, ty, { align: "center" });
    ink(C.text); pdf.setFont(false);
    pdf.text(f.am.time, M + cDay + cT / 2, ty, { align: "center" });
    pdf.text(fit(f.am.place, cP - 3), M + cDay + cT + 1.5, ty);
    pdf.text(f.pm.time, M + cDay + cT + cP + cT / 2, ty, { align: "center" });
    pdf.text(fit(f.pm.place, cP - 3), M + cDay + 2 * cT + cP + 1.5, ty);
    if (f.prayer) pdf.text(fit(f.prayer, cO - 3), M + tw - cO + 1.5, ty);
  });
  y = hy + 7 * k + fieldRows * rh;
  }

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

/** Modelo simplificado (Modelo 2): temas, cânticos, reuniões especiais completas e campo em destaque. */
async function renderSimpleBoardPdf(m: BoardModel, opts: BoardRenderOptions): Promise<Blob> {
  const showTop = opts.topPhrase ?? false, showBottom = opts.bottomPhrase ?? false;
  const pdf = await createJsPdfCompat({ unit: "mm" });
  const W = pdf.pageW, H = pdf.pageH, M = 12, tw = W - 2 * M, bottom = H - 10;
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB, w: number) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const fit = (t0: string, w: number) => { let t = t0; while (t.length > 3 && pdf.measureText(t) > w) t = t.slice(0, -2); return t === t0 ? t0 : `${t.trimEnd()}…`; };
  pdf.setFont(false, true); pdf.setFontSize(9);
  const footLines = showBottom ? pdf.splitTextToSize(BOARD_BOTTOM_PHRASE, tw - 24) : [];
  const footH = (showBottom ? 5 + footLines.length * 4.2 : 0) + 5;
  const colW = (tw - 4) / 2;
  const specLines = (sp: BoardSpecialDetail, k: number) => { pdf.setFont(false); pdf.setFontSize(8.5 * k); return sp.theme ? Math.min(2, pdf.splitTextToSize(sp.theme, colW - 26).length) : 1; };
  const height = (k: number) => {
    const head = 22 + (showTop ? 6 : 0);
    const meet = 3 * (8 * k) + 3 * (6 * k + 7 * k) + (6 * k + 7 * k) + 4;
    const spec = m.specialsDetail.length ? 2 + 8 * k + 6 * k + Math.max(...m.specialsDetail.map((sp) => (4 + specLines(sp, k)) * 4.6 * k)) + 3 : 0;
    return head + meet + spec + fieldDetailHeight(m.fieldDetail, k) + footH;
  };
  let k = 1;
  while (k > 0.7 + 1e-9 && 10 + height(k) > bottom) k -= 0.05;
  const F = (n: number) => pdf.setFontSize(n * k);
  let y = 16;
  ink(C.text); pdf.setFont(true); pdf.setFontSize(15);
  pdf.text("PROGRAMAÇÃO", W / 2, y, { align: "center" }); y += 6.5;
  pdf.text("VISITA DO SUPERINTENDENTE DE CIRCUITO", W / 2, y, { align: "center" }); y += 5;
  ink(C.muted); pdf.setFont(false); pdf.setFontSize(9);
  pdf.text(fit(`${m.congregation ? `${m.congregation} · ` : ""}${m.range}`, tw), W / 2, y, { align: "center" });
  if (showTop) { y += 5.5; ink(C.text); pdf.setFont(false, true); pdf.setFontSize(10); pdf.text(fit(BOARD_TOP_PHRASE, tw), W / 2, y, { align: "center" }); }
  y += 5;
  const band = (title: string) => {
    fill(C.light); pdf.rect(M, y, tw, 8 * k, "F");
    ink(C.text); pdf.setFont(true); F(12); pdf.text(title, W / 2, y + 5.6 * k, { align: "center" });
    y += 8 * k + 1;
  };
  const sub = (title: string, x = M, w = tw) => {
    fill(C.soft); pdf.rect(x, y, w, 6 * k, "F");
    ink(C.text); pdf.setFont(true); F(8.5); pdf.text(title, x + w / 2, y + 4.2 * k, { align: "center" });
  };
  const titled = (label: string, t: string) => { sub(label); y += 6 * k; ink(C.text); pdf.setFont(false); F(11); pdf.text(fit(t || "________________", tw - 6), W / 2, y + 5 * k, { align: "center" }); y += 7 * k; };
  band("REUNIÃO DO MEIO DE SEMANA");
  titled("DISCURSO DE SERVIÇO", m.serviceTalk);
  band("REUNIÃO DO FIM DE SEMANA");
  titled("DISCURSO PÚBLICO", m.publicTalk);
  titled("DISCURSO DE SERVIÇO FINAL", m.finalTalk);
  sub("CÂNTICOS"); y += 6 * k;
  const songCells: Array<[string, string]> = [["Terça-feira (final): ", m.songs.midFinal], ["Fim de semana (inicial): ", m.songs.weOpen], ["Fim de semana (final): ", m.songs.weClose]];
  songCells.forEach(([l, v], j) => {
    const cx = M + tw * (j + 0.5) / 3;
    pdf.setFont(true); F(9); const lw = pdf.measureText(l); pdf.setFont(false); F(10); const vw = pdf.measureText(v || "___");
    const x0 = cx - (lw + vw) / 2;
    ink(C.text); pdf.setFont(true); F(9); pdf.text(l, x0, y + 5 * k);
    pdf.setFont(false); F(10); pdf.text(v || "___", x0 + lw, y + 5 * k);
  });
  y += 7 * k + 4;
  if (m.specialsDetail.length) {
    band("REUNIÕES ESPECIAIS");
    const top = y;
    let maxY = y;
    m.specialsDetail.forEach((sp, j) => {
      const x = M + j * (colW + 4);
      y = top; sub(sp.title.toUpperCase(), x, colW); y += 6 * k;
      const kv = (label: string, v: string, lines = 1) => {
        ink(C.text); pdf.setFont(true); F(8.5); pdf.text(label, x + 1.5, y + 4 * k);
        pdf.setFont(false); F(8.5);
        const ls = lines > 1 ? pdf.splitTextToSize(v || "________", colW - 26).slice(0, 2) : [fit(v || "________", colW - 26)];
        ls.forEach((ln, n) => pdf.text(ln, x + 24, y + 4 * k + n * 4.2 * k));
        y += 4.6 * k * Math.max(1, ls.length);
      };
      kv("Local:", sp.place); kv("Dia e hora:", sp.when); kv("Tema:", sp.theme, 2);
      kv("Oração inicial:", sp.opening); kv("Oração final:", sp.closing);
      maxY = Math.max(maxY, y);
    });
    if (m.specialsDetail.length > 1) { stroke(C.text, 0.4); pdf.line(M + colW + 2, top, M + colW + 2, maxY); }
    y = maxY + 3;
  }
  y = drawFieldDetail(pdf, m.fieldDetail, y, k, M, W, "REUNIÕES PARA O SERVIÇO DE CAMPO", true);
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

/** Itens que faltam no Programa da visita (aviso antes de gerar). */
export function boardMissing(m: BoardModel, template: BoardTemplate): string[] {
  const out: string[] = [];
  if (template === "full") {
    if (m.midweek.some((r) => /coment[aá]rios iniciais/i.test(r.text) && !r.who)) out.push("presidente do meio de semana");
    const last = [...m.midweek].reverse().find((r) => r.italic && /ora[cç][aã]o/i.test(r.text));
    if (last && !last.who) out.push("oração final do meio de semana");
  } else {
    if (!m.serviceTalk) out.push("discurso de serviço");
    if (!m.publicTalk) out.push("discurso público");
  }
  if (!m.fieldDetail.length) out.push("saídas de campo");
  return out;
}
