// PDF A4 da "Pauta – Reunião com Anciãos" no layout do modelo enviado pelo SC:
// título, versículos, faixa Oração inicial / recomendação / final / Ata / Tempo, caixas com tempos à direita.
import { createJsPdfCompat, type JsPdfCompat } from "@/lib/pdf/pdf-engine";
import { agendaView, htmlToPlain, type AgendaAuto, type AgendaPayload } from "./agenda";

export const AGENDA_VERSES = "Isa 50:4; Pro 18:13,17; Tia 1:19; 1 Cor 4:6; 2 Cor 1:24; Col 2:8; Mat 5:41; Tito 1:5";
type RGB = [number, number, number];
const RED: RGB = [200, 30, 30], INK: RGB = [25, 25, 25], BEIGE: RGB = [238, 234, 222], GREEN: RGB = [196, 222, 170], PEACH: RGB = [249, 214, 190], GREY: RGB = [205, 205, 205], LINE: RGB = [40, 40, 40], BLUE: RGB = [40, 80, 160];
const LINK_LABEL: Record<string, string> = { book: "Leitura", article: "Artigo", video: "Vídeo" };

export interface AgendaPdfInput { payload: AgendaPayload; auto: AgendaAuto; congregation: string; range: string }

export async function renderAgendaPdf(input: AgendaPdfInput): Promise<Blob> {
  const pdf = await createJsPdfCompat({ unit: "mm" });
  const W = pdf.pageW, H = pdf.pageH, M = 12, tw = W - 2 * M, timeW = 30;
  const p = input.payload, a = input.auto, v = agendaView(p, a);
  let y = 14;
  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const ensure = (h: number) => { if (y + h > H - 12) { pdf.addPage(); y = 14; } };
  const box = (x: number, yy: number, w: number, h: number, bg?: RGB) => {
    if (bg) { fill(bg); pdf.rect(x, yy, w, h, "F"); }
    pdf.setDrawColor(LINE[0], LINE[1], LINE[2]); pdf.setLineWidth(0.35); pdf.rect(x, yy, w, h, "S");
  };
  const para = (text: string, x: number, w: number, size = 9.5, minLines = 2): number => {
    pdf.setFont(false); pdf.setFontSize(size); color(INK);
    const lines = text ? pdf.splitTextToSize(text, w) : [];
    const lh = size * 0.42;
    const h = Math.max(minLines, lines.length) * lh + 3;
    ensure(h);
    lines.forEach((l, i) => pdf.text(l, x, y + 4 + i * lh));
    return h;
  };
  /** Cabeçalho vermelho com tempo à direita. */
  const head = (title: string, minutes: number | null, bg: RGB = BEIGE) => {
    ensure(9);
    box(M, y, tw - (minutes != null ? timeW : 0), 8, bg);
    pdf.setFont(true); let fs = 11; pdf.setFontSize(fs);
    const maxW = tw - (minutes != null ? timeW : 0) - 6;
    while (fs > 7.5 && pdf.measureText(title) > maxW) { fs -= 0.5; pdf.setFontSize(fs); }
    color(RED); pdf.text(title, M + 3, y + 5.6);
    if (minutes != null) { box(W - M - timeW, y, timeW, 8); pdf.setFont(false); pdf.setFontSize(10); color(INK); pdf.text(`(${String(minutes).padStart(2, "0")} minutos)`, W - M - timeW / 2, y + 5.4, { align: "center" }); }
    y += 8;
  };
  const label = (t: string, size = 9.5, red = false) => { ensure(7); pdf.setFont(true, true); pdf.setFontSize(size); color(red ? RED : INK); pdf.text(t, M + 3, y + 4.6); y += 6; };
  const textBox = (text: string, minLines = 3, bg?: RGB) => {
    pdf.setFont(false); pdf.setFontSize(9.5);
    const n = Math.max(minLines, text ? pdf.splitTextToSize(text, tw - 6).length : 0);
    const h = n * 9.5 * 0.42 + 3;
    ensure(h);
    if (bg) { fill(bg); pdf.rect(M, y, tw, h, "F"); }
    const top = y; para(text, M + 3, tw - 6, 9.5, minLines); box(M, top, tw, h); y = top + h;
  };

  // Título
  pdf.setFont(true); pdf.setFontSize(20); color(INK); pdf.text("PAUTA - REUNIÃO COM ANCIÃOS", W / 2, y, { align: "center" }); y += 5;
  pdf.setFont(false); pdf.setFontSize(9); color(BLUE); pdf.text(AGENDA_VERSES, W / 2, y, { align: "center" }); y += 3.5;
  const sub = [input.congregation, input.range, a.location].filter(Boolean).join(" · ");
  if (sub) { pdf.setFontSize(8.5); color(INK); pdf.text(sub, W / 2, y + 2, { align: "center" }); y += 4; }
  y += 1.5;

  // Faixa de orações / ata / tempo
  const cols: Array<{ t: string; v: string; w: number; bg: RGB; c: RGB }> = [
    { t: "ORAÇÃO INICIAL:", v: v.prayerOpen, w: 0.2, bg: BEIGE, c: RED },
    { t: "ORAÇÃO RECOMENDAÇÃO:", v: p.prayerRec, w: 0.19, bg: BEIGE, c: RED },
    { t: "ORAÇÃO FINAL:", v: v.prayerClose, w: 0.23, bg: BEIGE, c: RED },
    { t: "ATA [Sfg 1:6]", v: p.minutesTaker, w: 0.21, bg: GREEN, c: RED },
    { t: "TEMPO (TL)", v: `${v.totalMinutes} minutos`, w: 0.17, bg: PEACH, c: INK },
  ];
  let x = M;
  for (const c of cols) {
    const w = tw * c.w;
    fill(c.bg); pdf.rect(x + 0.4, y, w - 0.8, 7, "F"); pdf.rect(x + 0.4, y + 7.6, w - 0.8, 6.4, "F");
    pdf.setFont(true); pdf.setFontSize(c.t.length > 15 ? 7 : 9); color(c.c); pdf.text(c.t, x + w / 2, y + 4.8, { align: "center" });
    pdf.setFont(false); pdf.setFontSize(9); color(c.t.startsWith("TEMPO") ? RED : INK); pdf.text(c.v.slice(0, 26), x + w / 2, y + 12.2, { align: "center" });
    x += w;
  }
  y += 17;

  // Encorajamentos e conselhos
  ensure(16);
  box(M, y, tw - timeW, 7.5, BEIGE); box(M, y + 7.5, tw - timeW, 7.5, BEIGE); box(W - M - timeW, y, timeW, 15);
  pdf.setFont(true); pdf.setFontSize(10.5); color(RED); pdf.text("ENCORAJAMENTOS E CONSELHOS | [Necessidade local.]", M + 3, y + 5.2);
  pdf.text("Tema / Assunto:", M + 10, y + 12.6);
  pdf.setFont(false); color(INK); pdf.text(pdf.splitTextToSize(v.encTheme, tw - timeW - 48)[0] ?? "", M + 42, y + 12.6);
  pdf.setFontSize(10); pdf.text("Tempo", W - M - timeW / 2, y + 6, { align: "center" }); pdf.text(`(${p.encMinutes} minutos)`, W - M - timeW / 2, y + 11.5, { align: "center" });
  y += 15;
  { const top = y; label("Informações do SC:"); const h = para(htmlToPlain(p.scInfo), M + 3, tw - 6, 9.5, 4); y += h; box(M, top, tw, y - top); }
  ensure(8); box(M, y, tw, 7); pdf.setFont(true, true); pdf.setFontSize(9.5); color(INK); pdf.text("RECOMENDAÇÕES PARA ASSISTIR, RECAPTULAR E MEDITAR", M + 3, y + 4.8); y += 7;
  textBox(htmlToPlain(p.reco), 3, BEIGE);
  for (const l of p.links) {
    ensure(7);
    box(M, y, 10, 6.5, BEIGE); box(M + 10, y, tw - 10 - timeW, 6.5, BEIGE); box(W - M - timeW, y, timeW, 6.5);
    pdf.setFont(true); pdf.setFontSize(6.5); color(INK); pdf.text(LINK_LABEL[l.kind].slice(0, 6), M + 5, y + 4.3, { align: "center" });
    pdf.setFont(false); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(l.label || l.url, tw - 16 - timeW)[0] ?? "", M + 12, y + 4.5);
    if (l.url) { color(BLUE); pdf.text("Clique aqui!", W - M - timeW / 2, y + 4.5, { align: "center" }); pdf.link(W - M - timeW, y, timeW, 6.5, l.url); pdf.link(M + 10, y, tw - 10 - timeW, 6.5, l.url); }
    else { color(INK); pdf.text("-", W - M - timeW / 2, y + 4.5, { align: "center" }); }
    y += 6.5;
  }
  ensure(8); box(M, y, tw, 7, BEIGE); pdf.setFont(true); pdf.setFontSize(9.5); color(INK); pdf.text("INFORMAÇÕES ADICIONAIS DOS ANCIÃOS SOBRE A NECESSIDADE LOCAL:", W / 2, y + 4.8, { align: "center" }); y += 7;
  textBox(htmlToPlain(p.eldersInfo), 5, BEIGE);
  y += 2;

  // 1) Cartas
  head("1) REVISÃO DAS ÚLTIMAS CARTAS DA FILIAL:", p.lettersMinutes, [255, 255, 255]);
  textBox(htmlToPlain(p.letters), 2);
  y += 2;

  // 2) Recomendações
  head("2) RECOMENDAÇÕES PARA ANCIÃOS E SERVOS MINISTERIAIS / CANCELAMENTOS", p.recsMinutes, [255, 255, 255]);
  const recs = a.recommendations.length ? a.recommendations : [{ id: "_1", title: "Ancião | Servo Ministerial", info: "" }, { id: "_2", title: "Ancião | Servo Ministerial", info: "" }];
  recs.forEach((r, i) => {
    ensure(18);
    box(M, y, tw, 6.5, [242, 242, 242]); pdf.setFont(true); pdf.setFontSize(10); color(INK); pdf.text(`2.${i + 1} — ${r.title}`, M + 8, y + 4.6); y += 6.5;
    const top = y; label("Informação partilhada pelo CA:");
    const txt = [r.info, htmlToPlain(p.recNotes[r.id] ?? "")].filter(Boolean).join("\n");
    y += para(txt, M + 3, tw - 6, 9.5, 3); box(M, top, tw, y - top);
  });
  y += 3;

  // 5) Assunto local
  head("5) ASSUNTO LOCAL SOLICITADO PELO CORPO DE ANCIÃOS", p.localMinutes);
  const locs = a.local.length ? a.local : [{ id: "_", suggestedBy: "", subject: "", sources: "", info: "" }];
  for (const l of locs) {
    ensure(22);
    const qW = tw * 0.2;
    box(M, y, qW, 12); box(M + qW, y, tw - qW, 12);
    pdf.setFont(true); pdf.setFontSize(9.5); color(INK); pdf.text("Quem indicou:", M + 1.5, y + 4.5); pdf.text("Tema do assunto a ser tratado:", M + qW + 1.5, y + 4.5);
    pdf.setFont(false); pdf.text(pdf.splitTextToSize(l.suggestedBy, qW - 3)[0] ?? "", M + 1.5, y + 9.5); pdf.text(pdf.splitTextToSize(l.subject, tw - qW - 3)[0] ?? "", M + qW + 1.5, y + 9.5);
    y += 12;
    const top = y; pdf.setFont(true); pdf.setFontSize(9.5); pdf.text("Fontes de matéria já pesquisadas:", M + 1.5, y + 4.5); y += 6;
    y += para([l.sources, l.info].filter(Boolean).join("\n"), M + 1.5, tw - 3, 9.5, 2); box(M, top, tw, y - top);
  }
  if (htmlToPlain(p.localNotes)) textBox(htmlToPlain(p.localNotes), 2);
  ensure(8); fill(GREY); pdf.rect(M, y, tw, 6.5, "F"); pdf.setFont(false); pdf.setFontSize(10); color(RED); pdf.text("Superintendente de Circuito – Recomendação de leitura e meditação.", M + 1.5, y + 4.6); y += 6.5;
  textBox(htmlToPlain(p.scReading), 2);
  return pdf.output("blob");
}

export type { JsPdfCompat };
