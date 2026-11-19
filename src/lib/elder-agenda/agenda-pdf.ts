// PDF A4 da "Pauta – Reunião com Anciãos" em três estilos à escolha do usuário:
// "formal" (ata sóbria), "cards" (cartões One UI) e "timeline" (horários calculados à esquerda).
// Os blocos saem na ordem e com a numeração escolhidas; links viram "Clique aqui" clicável.
import { createJsPdfCompat, type JsPdfCompat } from "@/lib/pdf/pdf-engine";
import {
  CARD_TYPE_LABEL, DEFAULT_AGENDA_VERSES, agendaView, isScOnlyCard, prayerRecShown, htmlToPlain, itemUrls, numberedBlocks, recInfoView, sharedAttachments,
  type AgendaAuto, type AgendaBlock, type AgendaCard, type AgendaLinkKind, type AgendaPayload,
} from "./agenda";

/** Versículos padrão (cada SC pode trocar na pauta). */
export const AGENDA_VERSES = DEFAULT_AGENDA_VERSES;
export type AgendaPdfStyle = "formal" | "cards" | "timeline";
export const AGENDA_PDF_STYLES: Array<{ id: AgendaPdfStyle; label: string; hint: string }> = [
  { id: "formal", label: "Ata formal", hint: "Sóbrio, numeração grande e tempos pontilhados" },
  { id: "cards", label: "Cartões", hint: "Cartões arredondados, moderno e arejado" },
  { id: "timeline", label: "Linha do tempo", hint: "Horário de cada bloco à esquerda" },
];
type RGB = [number, number, number];
const INK: RGB = [28, 30, 36], MUTED: RGB = [110, 115, 125], NAVY: RGB = [30, 58, 110], SOFT: RGB = [236, 241, 250], RULE: RGB = [200, 205, 215], LINK: RGB = [25, 90, 200];
const KIND_LABEL: Record<AgendaLinkKind, string> = { book: "Leitura", article: "Artigo", video: "Vídeo" };

export interface AgendaPdfInput { payload: AgendaPayload; auto: AgendaAuto; congregation: string; range: string; style?: AgendaPdfStyle }

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function whenLine(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return "";
  const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} · ${hhmm(d)}`;
}

export async function renderAgendaPdf(input: AgendaPdfInput): Promise<Blob> {
  const style = input.style ?? "timeline";
  const pdf = await createJsPdfCompat({ unit: "mm" });
  const W = pdf.pageW, H = pdf.pageH, M = 16;
  const gutter = style === "timeline" ? 22 : style === "formal" ? 12 : 0;
  const X = M + gutter, CW = W - M - X; // coluna de conteúdo
  const p = { ...input.payload, blocks: input.payload.blocks.map((b) => ({ ...b, cards: b.cards.filter((c) => !isScOnlyCard(c)) })) }, a = input.auto, v = agendaView(p, a);
  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const draw = (c: RGB, w = 0.3) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  let y = 18;
  let page = 1;
  const footer = () => {
    pdf.setFont(false, true); pdf.setFontSize(7.5); color(MUTED);
    pdf.text(`${input.payload.headerTitle.trim() || "Pauta – Reunião com os anciãos"} · ${input.congregation}`, M, H - 8);
    pdf.text(`Página ${page}`, W - M, H - 8, { align: "right" });
  };
  const ensure = (h: number) => { if (y + h > H - 16) { footer(); pdf.addPage(); page++; y = 18; } };

  const para = (text: string, x: number, w: number, size = 9.5) => {
    if (!text) return;
    pdf.setFont(false); pdf.setFontSize(size); color(INK);
    const lh = size * 0.43;
    for (const line of pdf.splitTextToSize(text, w)) { ensure(lh + 1); pdf.text(line, x, y + lh); y += lh; }
    y += 1.5;
  };
  const label = (t: string, x = X) => { ensure(6); pdf.setFont(true); pdf.setFontSize(8); color(MUTED); pdf.text(t.toUpperCase(), x, y + 3.6); y += 5.2; };
  const blank = (lines: number) => { // linhas para anotar à mão
    draw(RULE, 0.2);
    for (let i = 0; i < lines; i++) { ensure(7); y += 6.5; pdf.line(X, y, X + CW, y); }
    y += 2;
  };
  const icon = (kind: AgendaLinkKind, x: number, yy: number) => {
    draw(NAVY, 0.35);
    if (kind === "book") { pdf.rect(x, yy, 2.6, 3.4, "S"); pdf.rect(x + 2.6, yy, 2.6, 3.4, "S"); }
    else if (kind === "article") { pdf.rect(x, yy + 2.2, 5.2, 1.2, "S"); pdf.rect(x + 0.4, yy + 1, 4.4, 1.2, "S"); pdf.rect(x + 0.8, yy - 0.2, 3.6, 1.2, "S"); }
    else { pdf.rect(x, yy, 5.2, 3.4, "S"); pdf.line(x + 2, yy + 0.8, x + 2, yy + 2.6); pdf.line(x + 2, yy + 0.8, x + 3.6, yy + 1.7); pdf.line(x + 2, yy + 2.6, x + 3.6, yy + 1.7); }
  };

  // ---------- Cabeçalho ----------
  fill(NAVY); pdf.rect(0, 0, W, 4, "F");
  pdf.setFont(true); pdf.setFontSize(17); color(NAVY); pdf.text(p.headerTitle.trim() || "Pauta – Reunião com os Anciãos", W / 2, y, { align: "center" }); y += 6;
  if (p.headerVerses.trim()) {
    pdf.setFont(false, true); pdf.setFontSize(8.5); color(MUTED);
    for (const l of pdf.splitTextToSize(p.headerVerses.trim(), W - 2 * M)) { pdf.text(l, W / 2, y, { align: "center" }); y += 3.8; }
    y += 1.2;
  }
  pdf.setFont(false); pdf.setFontSize(9.5); color(INK);
  const sub = [input.congregation, whenLine(a.meetingAt) || input.range, a.location].filter(Boolean).join("  ·  ");
  if (sub) { pdf.text(sub, W / 2, y, { align: "center" }); y += 4; }
  y += 2;

  // Faixa de orações e tempo
  const cells: Array<[string, string]> = [["Oração inicial", v.prayerOpen]];
  if (prayerRecShown(p, a)) cells.push(["Oração recomendação", p.prayerRec]);
  cells.push(["Oração final", v.prayerClose]);
  if (p.showMinutes) cells.push(["Ata", p.minutesTaker]);
  cells.push(["Tempo total", `${v.totalMinutes} min`]);
  const last = cells.length - 1;
  const cw = (W - 2 * M) / cells.length;
  if (style === "cards") { fill(SOFT); pdf.rect(M, y, W - 2 * M, 13, "F"); } else { draw(RULE, 0.3); pdf.line(M, y, W - M, y); pdf.line(M, y + 13, W - M, y + 13); }
  cells.forEach(([t, val], i) => {
    const cx = M + cw * i + cw / 2;
    pdf.setFont(true); pdf.setFontSize(7); color(MUTED); pdf.text(t.toUpperCase(), cx, y + 4.6, { align: "center" });
    pdf.setFont(i === last); pdf.setFontSize(9); color(i === last ? NAVY : INK);
    pdf.text(pdf.splitTextToSize(val || "—", cw - 3)[0] ?? "", cx, y + 10, { align: "center" });
  });
  y += 19;

  // ---------- Blocos ----------
  const start = a.meetingAt ? new Date(a.meetingAt) : null;
  const list = numberedBlocks(p.blocks, a);
  for (const { block: b, n, startMin } of list) {
    ensure(18);
    const top = y, pageTop = page;
    // Título
    const minTxt = b.minutes ? `${b.minutes} min` : "";
    if (style === "cards") {
      fill(SOFT); pdf.rect(M, y, W - 2 * M, 8.5, "F");
      fill(NAVY); pdf.rect(M, y, 1.4, 8.5, "F");
      pdf.setFont(true); pdf.setFontSize(10.5); color(NAVY);
      pdf.text(`${n}. ${pdf.splitTextToSize(b.title, W - 2 * M - 30)[0] ?? ""}`, M + 4.5, y + 5.7);
      if (minTxt) { pdf.setFontSize(8.5); pdf.text(minTxt, W - M - 3, y + 5.7, { align: "right" }); }
      y += 11;
    } else {
      if (style === "formal") { pdf.setFont(true); pdf.setFontSize(18); color(NAVY); pdf.text(String(n), M, y + 6.5); }
      if (style === "timeline" && start) {
        const t = new Date(start.getTime() + startMin * 60_000);
        pdf.setFont(true); pdf.setFontSize(10); color(NAVY); pdf.text(hhmm(t), M, y + 5);
      } else if (style === "timeline") { pdf.setFont(true); pdf.setFontSize(10); color(NAVY); pdf.text(`+${startMin}′`, M, y + 5); }
      pdf.setFont(true); pdf.setFontSize(11); color(INK);
      const titleW = CW - (minTxt ? 22 : 0);
      const tl = pdf.splitTextToSize(`${style === "timeline" ? `${n}. ` : ""}${b.title}`, titleW);
      tl.forEach((l, i) => pdf.text(l, X, y + 5 + i * 4.8));
      if (minTxt) {
        pdf.setFont(false); pdf.setFontSize(9); color(MUTED);
        const tx = W - M; pdf.text(minTxt, tx, y + 5, { align: "right" });
        if (style === "formal") { // pontilhado entre o título e o tempo
          const lastW = pdf.measureText(tl[tl.length - 1] ?? "");
          draw(RULE, 0.2);
          const yy = y + 5 + (tl.length - 1) * 4.8;
          for (let dx = X + lastW + 2; dx < tx - pdf.measureText(minTxt) - 2; dx += 1.6) pdf.line(dx, yy, dx + 0.4, yy);
        }
      }
      y += 3 + tl.length * 4.8;
    }

    // Conteúdo: cartões na ordem escolhida
    const ix = style === "cards" ? M + 4.5 : X, iw = style === "cards" ? W - 2 * M - 9 : CW;
    const multi = b.cards.length > 1;
    const linksOf = (c: AgendaCard) => {
      for (const it of c.items) {
        const urls = itemUrls(it);
        if (!it.text && !urls.length) continue;
        ensure(7);
        icon(it.kind, ix, y + 0.8);
        pdf.setFont(false); pdf.setFontSize(9.5); color(INK);
        const textW = iw - 34;
        const lines = pdf.splitTextToSize(it.text || KIND_LABEL[it.kind], textW);
        lines.forEach((l, i) => pdf.text(l, ix + 8, y + 3.8 + i * 4.1));
        if (urls.length) {
          pdf.setFont(true); pdf.setFontSize(9); color(LINK);
          const lbl = urls.length > 1 ? `Clique aqui (${urls.length})` : "Clique aqui";
          pdf.text(lbl, ix + iw, y + 3.8, { align: "right" });
          // Um PDF abre um link por toque: cada link da linha ganha sua faixa clicável.
          const w = pdf.measureText(lbl), segW = w / urls.length;
          urls.forEach((u, i) => pdf.link(ix + iw - w + i * segW, y, segW, 5, u));
          if (urls.length > 1) {
            y += Math.max(1, lines.length) * 4.1 + 0.5;
            pdf.setFont(false); pdf.setFontSize(7.5);
            urls.forEach((u, i) => { ensure(4); pdf.text(`${i + 1}. ${u.replace(/^https?:\/\//, "").slice(0, 70)}`, ix + 8, y + 3); pdf.link(ix + 8, y, iw - 8, 3.8, u); y += 3.6; });
            y += 1.5; continue;
          }
        }
        y += Math.max(1, lines.length) * 4.1 + 2;
      }
    };
    for (const c of b.cards) {
      if (multi && c.type !== "notes") label(CARD_TYPE_LABEL[c.type], ix);
      if (c.showSubject) { label("Tema / Assunto", ix); para(c.subject || "—", ix, iw, 10); }
      const plain = htmlToPlain(c.html);
      if (c.type === "recs") {
        a.recommendations.forEach((r, i) => {
          const ri = recInfoView(c, r);
          ensure(10); pdf.setFont(true); pdf.setFontSize(9.5); color(INK); pdf.text(`${n}.${i + 1}  ${r.title}`, ix, y + 4); y += 5.5;
          para([ri.family ? `Membros da família: ${ri.family}` : "", ri.fieldGroup ? `Grupo de campo: ${ri.fieldGroup}` : "",
            htmlToPlain(ri.info), htmlToPlain(c.notes[r.id] ?? "")].filter(Boolean).join("\n"), ix + 5, iw - 5, 9);
        });
      } else if (c.type === "local") {
        a.local.forEach((l) => {
          ensure(10);
          pdf.setFont(true); pdf.setFontSize(9.5); color(INK); pdf.text(pdf.splitTextToSize(l.subject || "Assunto", iw)[0] ?? "", ix, y + 4); y += 5;
          para([l.suggestedBy ? `Quem indicou: ${l.suggestedBy}` : "", l.sources ? `Fontes: ${l.sources}` : "", l.info].filter(Boolean).join("\n"), ix + 5, iw - 5, 9);
        });
      }
      if (plain && c.type !== "recs") para(plain, ix, iw);
      if (c.type === "links") linksOf(c);
      for (const at of sharedAttachments(c)) {
        ensure(5); pdf.setFont(false); pdf.setFontSize(8.5); color(MUTED);
        const t = `Anexo: ${at.title}`.slice(0, 90);
        pdf.text(t, ix, y + 3.5);
        if (at.kind === "link") { color(LINK); pdf.text("Abrir", ix + iw, y + 3.5, { align: "right" }); pdf.link(ix + iw - 10, y, 10, 4.5, at.url); }
        else { pdf.text("no app", ix + iw, y + 3.5, { align: "right" }); }
        y += 4.6;
      }
      if (!plain && !c.showSubject && (c.type === "notes" || c.type === "eldersInfo" || c.type === "scReply")) blank(2);
    }

    // Moldura/linha do bloco
    if (style === "timeline" && page === pageTop) { draw(RULE, 0.4); pdf.line(M + 3, top + 7, M + 3, Math.max(top + 9, y - 1)); fill(NAVY); pdf.rect(M + 2.1, top + 6.2, 1.8, 1.8, "F"); }
    if (style === "formal") { draw(RULE, 0.2); pdf.line(X, y + 1, W - M, y + 1); }
    y += style === "cards" ? 4 : 5;
  }
  footer();
  return pdf.output("blob");
}

export type { JsPdfCompat };
export type { AgendaBlock };
