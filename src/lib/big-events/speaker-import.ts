// Importar oradores (Nº do esboço + orador + congregação) de .csv, .xlsx, .docx ou .pdf.
// Tudo roda no aparelho; o arquivo é entrada não confiável (limites e rejeição de DOCTYPE/macros).
import { IMPORT_MAX_BYTES, decodeXml, normalizeName, openZip, parseCsvRows, rejectUnsafe } from "@/lib/congregation-import";

/** role: discurso (pelo Nº), presidente ou oração (pela ordem/horário). */
export type SpeakerRole = "talk" | "chair" | "prayer";
export type SpeakerRow = { number: string; speaker: string; congregation: string | null; role?: SpeakerRole; time?: string | null; label?: string };

export type PartLike = {
  id: string; outline_number: string | null; theme: string; assigned_to: string;
  part_time?: string | null; part_type_label?: string | null; sort_order?: number;
  speaker_name: string | null; speaker_congregation?: string | null; status: string;
};

export type MatchKind = "new" | "same" | "replace" | "confirmed" | "missing";
export type SpeakerMatch = { row: SpeakerRow; part: PartLike | null; kind: MatchKind; checked: boolean; swapped?: boolean };

const SPLIT_RE = /\t|;|\||\s[–—-]\s|\s{3,}/;
const NUM_RE = /^(?:n[ºo°.]?\s*|#\s*)?(\d{1,4})[.)º°]?$/i;

export function normNum(s: string | null | undefined): string {
  const m = (s ?? "").match(/\d+/);
  return m ? String(Number(m[0])) : "";
}

function similar(a: string, b: string): boolean {
  const x = normalizeName(a), y = normalizeName(b);
  return !!x && !!y && (x === y || (x.length > 8 && y.includes(x)) || (y.length > 8 && x.includes(y)));
}

// Programa oficial (Running Program): o Nº vem no tema ("N.1: ...", "N.10: ...").
const N_THEME_RE = /^N[º°o]?\.?\s*(\d{1,3})\s*:/i;
// Coluna "Tipo" do programa oficial e textos que nunca são nome de orador.
const TYPE_RE = /^(?:discurso|discursos|ora[çc][ãa]o|c[âa]ntico|presidente|intervalo|v[íi]deo|drama|entrevistas?(?:\(s\))?|talk|prayer|song|chairman|interval|discurso\s*-\s*com:?.*)$/i;
const EMPTY_SPEAKER_RE = /^(?:n\/?a|—|–|-|a designar|tbd|tba)$/i;
// "SC Fulano" / "Rep. Filial": partes do superintendente ou da filial, nunca de orador importado.
const NOT_SPEAKER_RE = /^(?:sc|s\.c\.|rep\.?\s*(?:da\s*)?filial|representante\s+da\s+filial)\b/i;
const TIME_RE = /^\d{1,2}[:h]\d{2}$/;

function cleanCong(s: string | null | undefined): string | null {
  const v = (s ?? "").replace(/\s+/g, " ").replace(/[\s,.;–—-]+$/, "").trim();
  return v ? v.slice(0, 120) : null;
}

/** Linha do programa oficial com o Nº dentro do tema: "10:00 | N.1: Tema | Orador | Discurso". */
function parseNumberedThemeLine(fields: string[], themes: string[]): SpeakerRow | null {
  const ni = fields.findIndex((f) => N_THEME_RE.test(f));
  if (ni < 0) return null;
  const number = normNum(fields[ni].match(N_THEME_RE)![1]);
  const rest = fields
    .filter((_, i) => i !== ni)
    .filter((f) => !TIME_RE.test(f) && !/^\d+\s*min/i.test(f) && !TYPE_RE.test(f))
    .filter((f) => !themes.some((t) => similar(f, t)));
  if (!rest.length) return null;
  let speaker = rest[0];
  let congregation: string | null = rest[1] ?? null;
  const paren = speaker.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (!congregation && paren) { speaker = paren[1]; congregation = paren[2]; }
  speaker = speaker.replace(/\s+/g, " ").slice(0, 120).trim();
  if (!speaker || EMPTY_SPEAKER_RE.test(speaker) || NOT_SPEAKER_RE.test(speaker) || /\d{3,}/.test(speaker)) return null;
  return { number, speaker, congregation: cleanCong(congregation) };
}

/** Uma linha de texto → { número, orador, congregação } ou null. */
export function parseLine(line: string, themes: string[] = []): SpeakerRow | null {
  let fields = line.split(SPLIT_RE).map((f) => f.trim()).filter(Boolean);
  if (!fields.length) return null;
  // Formato do programa oficial (adição): só quando nenhuma coluna é um Nº solto.
  if (!fields.some((f) => NUM_RE.test(f)) && fields.some((f) => N_THEME_RE.test(f))) {
    return parseNumberedThemeLine(line.split(/\t|\||\s{3,}/).map((f) => f.trim()).filter(Boolean), themes);
  }
  // "12 João Silva" sem separador: número no início.
  if (fields.length === 1 || !fields.some((f) => NUM_RE.test(f))) {
    const m = fields[0].match(/^(?:n[ºo°.]?\s*)?(\d{1,4})[.)º°:]?\s+(.+)$/i);
    if (!m) return null;
    fields = [m[1], m[2], ...fields.slice(1)];
  }
  const ni = fields.findIndex((f) => NUM_RE.test(f));
  if (ni < 0) return null;
  const number = normNum(fields[ni]);
  let rest = fields.filter((_, i) => i !== ni).filter((f) => !themes.some((t) => similar(f, t)));
  rest = rest.filter((f) => !/^\d{1,2}[:h]\d{2}$/.test(f) && !/^\d+\s*min/i.test(f));
  if (!rest.length) return null;
  let speaker = rest.length >= 2 ? rest[rest.length - 2] : rest[0];
  let congregation: string | null = rest.length >= 2 ? rest[rest.length - 1] : null;
  // "João Silva (Cabiri)"
  const paren = speaker.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (!congregation && paren) { speaker = paren[1]; congregation = paren[2]; }
  speaker = speaker.slice(0, 120).trim();
  if (!speaker || /\d{3,}/.test(speaker) || EMPTY_SPEAKER_RE.test(speaker)) return null;
  return { number, speaker, congregation: congregation?.slice(0, 120).trim() || null };
}

export function linesToRows(lines: string[], themes: string[] = []): SpeakerRow[] {
  const out: SpeakerRow[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const r = parseLine(l, themes);
    if (r && !seen.has(r.number)) { seen.add(r.number); out.push(r); }
  }
  return out;
}

function cellText(xml: string): string {
  return decodeXml((xml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
}

/** Word: linhas de tabela viram células separadas por tab; parágrafos soltos viram linhas. */
export function docxToLines(xml: string): string[] {
  rejectUnsafe(xml);
  const lines: string[] = [];
  const body = xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (tr) => {
    lines.push((tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) ?? []).map(cellText).join("\t"));
    return "";
  });
  for (const p of body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) lines.push(cellText(p));
  return lines.filter((l) => l.trim());
}

export function xlsxToTabLines(sharedXml: string, sheetXml: string): string[] {
  rejectUnsafe(sharedXml); rejectUnsafe(sheetXml);
  const shared = (sharedXml.match(/<si>[\s\S]*?<\/si>/g) ?? []).map((si) =>
    decodeXml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
  const lines: string[] = [];
  for (const row of sheetXml.match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = [];
    for (const c of row.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const type = c.match(/ t="([^"]+)"/)?.[1];
      const v = c.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inline = c.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      if (type === "s" && v != null) cells.push(shared[Number(v)] ?? "");
      else if (inline != null) cells.push(decodeXml(inline));
      else if (v != null) cells.push(decodeXml(v));
    }
    const text = cells.filter((x) => x.trim()).join("\t");
    if (text) lines.push(text);
  }
  return lines;
}

/** Um pedaço de texto do PDF com posição (x/y em pontos, h = altura da letra). */
export type PdfItem = { page: number; x: number; y: number; w: number; h: number; s: string };

async function pdfItems(buf: ArrayBuffer): Promise<PdfItem[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out: PdfItem[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 60); n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    for (const it of content.items as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>) {
      if (!it.str?.trim() || !it.transform) continue;
      out.push({ page: n, x: it.transform[4], y: it.transform[5], w: it.width ?? 0, h: it.height || Math.abs(it.transform[3]) || 0, s: it.str });
    }
  }
  await doc.cleanup?.();
  if (!out.length) throw new Error("Este PDF não tem texto (parece digitalizado).");
  return out;
}

/** Itens do PDF → linhas de texto (colunas separadas por tab). Mesmo comportamento de antes. */
export function pdfItemsToLines(items: PdfItem[]): string[] {
  const lines: string[] = [];
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const rows = new Map<number, PdfItem[]>();
    for (const it of items) {
      if (it.page !== page) continue;
      const y = Math.round(it.y / 3) * 3;
      (rows.get(y) ?? rows.set(y, []).get(y)!).push(it);
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      let line = "", end = -Infinity;
      for (const i of row) { line += line ? (i.x - end > 12 ? "\t" : " ") + i.s : i.s; end = i.x + i.w; }
      lines.push(line.replace(/ {2,}/g, " "));
    }
  }
  return lines;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/**
 * Programa oficial em tabela (Horário | Tema | Orador | Tipo): o Nº está no tema ("N.1:"),
 * o nome do orador fica na coluna Orador e a congregação logo abaixo, em letra menor.
 * Lê pelas posições das colunas; páginas sem cabeçalho usam as colunas da página anterior.
 */
export function runningProgramRows(items: PdfItem[]): SpeakerRow[] {
  const out: SpeakerRow[] = [];
  const seen = new Set<string>();
  type Cols = { tema: number; orador: number; tipo: number; top: number };
  let cols = null as Cols | null;
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pageItems = items.filter((i) => i.page === page);
    const temaH = pageItems.find((i) => ["tema", "theme"].includes(norm(i.s)));
    const oradorH = temaH && pageItems.find((i) => ["orador", "oradores", "speaker"].includes(norm(i.s)) && Math.abs(i.y - temaH.y) < 4 && i.x > temaH.x);
    if (temaH && oradorH) {
      const tipoH = pageItems.find((i) => ["tipo", "type"].includes(norm(i.s)) && Math.abs(i.y - temaH.y) < 4 && i.x > oradorH.x);
      cols = { tema: temaH.x, orador: oradorH.x, tipo: tipoH?.x ?? Infinity, top: temaH.y };
    } else if (cols) {
      const prev: Cols = cols;
      cols = { tema: prev.tema, orador: prev.orador, tipo: prev.tipo, top: Infinity };
    }
    if (!cols) continue;
    const c = cols;
    const body = pageItems.filter((i) => i.y < c.top - 2);
    const inTheme = (i: PdfItem) => i.x >= c.tema - 4 && i.x < c.orador - 4;
    const inSpeaker = (i: PdfItem) => i.x >= c.orador - 4 && i.x < c.tipo - 4;
    // Âncoras: horário à esquerda do tema; sem horário, a linha "N.x:" do tema.
    let anchors = body.filter((i) => i.x < c.tema - 2 && TIME_RE.test(i.s.trim())).map((i) => i.y);
    if (!anchors.length) anchors = body.filter((i) => inTheme(i) && N_THEME_RE.test(i.s.trim())).map((i) => i.y);
    anchors = [...new Set(anchors.map((y) => Math.round(y)))].sort((a, b) => b - a);
    anchors.forEach((ay, k) => {
      const next = anchors[k + 1] ?? -Infinity;
      const block = body.filter((i) => i.y <= ay + 3 && i.y > next + 3).sort((a, b) => b.y - a.y || a.x - b.x);
      const theme = block.filter(inTheme).map((i) => i.s.trim()).join(" ");
      const m = theme.match(N_THEME_RE);
      if (!m) return;
      const number = normNum(m[1]);
      if (!number || seen.has(number)) return;
      // Linhas da coluna Orador (agrupadas por altura na página).
      const rows: Array<{ y: number; text: string; h: number }> = [];
      for (const i of block.filter(inSpeaker)) {
        const last = rows[rows.length - 1];
        if (last && Math.abs(last.y - i.y) < 3) { last.text += " " + i.s.trim(); last.h = Math.max(last.h, i.h); }
        else rows.push({ y: i.y, text: i.s.trim(), h: i.h });
      }
      if (!rows.length) return;
      const maxH = Math.max(...rows.map((r) => r.h));
      const mixed = rows.some((r) => r.h < maxH * 0.85);
      const name: string[] = [], cong: string[] = [];
      rows.forEach((r, idx) => {
        if (mixed) (r.h >= maxH * 0.85 ? name : cong).push(r.text);
        else if (idx === 0) name.push(r.text);
        else (/\d|,| - /.test(r.text) || cong.length ? cong : name).push(r.text);
      });
      const speaker = name.join(" ").replace(/\s+/g, " ").slice(0, 120).trim();
      if (!speaker || EMPTY_SPEAKER_RE.test(speaker) || NOT_SPEAKER_RE.test(speaker) || TYPE_RE.test(speaker)) return;
      seen.add(number);
      out.push({ number, speaker, congregation: cleanCong(cong.join(" ")) });
    });
  }
  return out;
}

export async function readSpeakerFile(file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<string[]> {
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Arquivo grande demais (máx. 10 MB).");
  const ext = file.name.toLowerCase().split(".").pop();
  const buf = await file.arrayBuffer();
  if (ext === "csv" || ext === "txt") return parseCsvRows(new TextDecoder("utf-8").decode(buf)).map((r) => r.join("\t"));
  if (ext === "docx") {
    const zip = await openZip(buf);
    if (Object.keys(zip.files).some((p) => /vbaProject/i.test(p))) throw new Error("Arquivo com macros não é aceito.");
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("Não parece um arquivo Word.");
    return docxToLines(xml);
  }
  if (ext === "xlsx") {
    const zip = await openZip(buf);
    if (Object.keys(zip.files).some((p) => /vbaProject/i.test(p))) throw new Error("Arquivo com macros não é aceito.");
    const sheet = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    if (!sheet) throw new Error("Não parece uma planilha Excel.");
    return xlsxToTabLines((await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "", sheet);
  }
  if (ext === "pdf") return pdfItemsToLines(await pdfItems(buf));
  throw new Error("Formato não aceito. Use .csv, .xlsx, .docx ou .pdf.");
}

/**
 * Lê o arquivo e devolve as linhas reconhecidas. No PDF, a tabela do programa oficial
 * (com a congregação embaixo do nome) é lida primeiro; as demais linhas seguem a leitura de sempre.
 */
export async function readSpeakerRows(
  file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  themes: string[] = [],
): Promise<SpeakerRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "docx") {
    const lines = await readSpeakerFile(file);
    const des = designacoesRows(lines);
    return des.length ? des : linesToRows(lines, themes);
  }
  if (ext !== "pdf") return linesToRows(await readSpeakerFile(file), themes);
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Arquivo grande demais (máx. 10 MB).");
  const items = await pdfItems(await file.arrayBuffer());
  const espiritual = programacaoEspiritualRows(items);
  if (espiritual.length) return espiritual;
  const lines = pdfItemsToLines(items);
  const app = appProgramRows(lines);
  if (app.length) return app;
  const table = runningProgramRows(items);
  const have = new Set(table.map((r) => r.number));
  return [...table, ...linesToRows(lines, themes).filter((r) => !have.has(r.number))];
}

// ---------- Novos formatos (adição) ----------
const CHAIR_RE = /presid/i;
const PRAYER_RE = /ora[çc][ãa]o/i;
const SKIP_NAME_RE = /a definir|superintendente de circuito|^rep\.?\s*filial|^-+$|^\d+\s*min/i;
function roleOf(theme: string): SpeakerRole { return CHAIR_RE.test(theme) ? "chair" : PRAYER_RE.test(theme) ? "prayer" : "talk"; }
function cleanName(s: string): string { return s.replace(/\s+/g, " ").trim().slice(0, 120); }
function pushRow(out: SpeakerRow[], r: SpeakerRow) {
  if (!r.speaker || SKIP_NAME_RE.test(r.speaker) || EMPTY_SPEAKER_RE.test(r.speaker) || NOT_SPEAKER_RE.test(r.speaker)) return;
  if (r.role === "talk" && (!r.number || out.some((x) => x.role === "talk" && x.number === r.number))) return;
  out.push(r);
}

/** PDF "Programação espiritual": NÚM | Tema | Cântico | Tempo | Cena | Orador | Congregação (por posição). */
export function programacaoEspiritualRows(items: PdfItem[]): SpeakerRow[] {
  const out: SpeakerRow[] = [];
  let cols: { orador: number; cong: number; start: number; themeEnd: number } | null = null;
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pi = items.filter((i) => i.page === page);
    const oh = pi.find((i) => norm(i.s) === "orador");
    const ch = pi.find((i) => norm(i.s) === "congregacao");
    if (oh && ch && ch.x > oh.x) {
      const cena = pi.find((i) => norm(i.s) === "cena");
      const cant = pi.find((i) => ["cantico", "tempo"].includes(norm(i.s)));
      cols = { orador: oh.x + oh.w / 2, cong: ch.x + ch.w / 2, start: cena ? cena.x + cena.w + 4 : oh.x - 60, themeEnd: cant ? cant.x - 2 : oh.x - 60 };
    }
    if (!cols) continue;
    const c = cols;
    const rows = new Map<number, PdfItem[]>();
    for (const it of pi) { const y = Math.round(it.y / 4) * 4; (rows.get(y) ?? rows.set(y, []).get(y)!).push(it); }
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      const time = row.find((i) => TIME_RE.test(i.s.trim()));
      if (!time) continue;
      const numIt = row.find((i) => i !== time && i.x < time.x + 70 && /^(?:\d{1,3}|S-\d+|-+)$/i.test(i.s.trim()));
      const theme = row.filter((i) => i !== time && i !== numIt && i.x < c.themeEnd).map((i) => i.s).join(" ").trim();
      const mid = (c.orador + c.cong) / 2;
      const spk = row.filter((i) => i.x >= c.start && i.x + i.w / 2 < mid).map((i) => i.s).join(" ");
      const cong = row.filter((i) => i.x + i.w / 2 >= mid).map((i) => i.s).join(" ");
      const num = numIt && /^\d+$/.test(numIt.s.trim()) ? normNum(numIt.s) : "";
      if (numIt && /^S-/i.test(numIt.s.trim())) continue;
      const role = num ? (CHAIR_RE.test(theme) ? "chair" : "talk") : roleOf(theme);
      if (role === "talk" && !num) continue;
      pushRow(out, { number: num, speaker: cleanName(spk), congregation: cleanCong(cong), role, time: time.s.trim(), label: theme.replace(/^▪️?\s*/, "").slice(0, 120) });
    }
  }
  return out.length >= 2 ? out : [];
}

/** PDF "Programa" gerado pelo app: linha "HH:MM  N Tema" e abaixo "Nome · Cong. X | Tipo · min". */
export function appProgramRows(lines: string[]): SpeakerRow[] {
  const out: SpeakerRow[] = [];
  let loose = "";
  for (let i = 0; i < lines.length; i++) {
    const f = lines[i].split("\t").map((x) => x.trim()).filter(Boolean);
    if (/^\d{1,3}$/.test(f[0] ?? "") && f.length <= 2) { loose = normNum(f[0]); continue; }
    if (!TIME_RE.test(f[0] ?? "") || !f[1]) continue;
    const m = f[1].match(/^(\d{1,3})\s+(.+)$/);
    const num = m ? normNum(m[1]) : loose;
    const theme = m ? m[2] : f[1];
    loose = "";
    const detail = lines[i + 1] ?? "";
    if (TIME_RE.test(detail.split("\t")[0]?.trim() ?? "")) continue;
    const who = detail.split("|")[0].split("·").map((x) => x.trim());
    const role = num ? "talk" : roleOf(theme);
    if (role === "prayer" && !/^ora[çc][ãa]o$/i.test(theme.trim())) continue;
    if (role === "talk" && !num) continue;
    pushRow(out, { number: num, speaker: cleanName(who[0] ?? ""), congregation: cleanCong((who[1] ?? "").replace(/^cong\.?\s*/i, "")), role, time: f[0], label: theme.slice(0, 120) });
  }
  return out.length >= 2 && lines.some((l) => /·\s*Cong\.|Ancião a definir|Superintendente de circuito/.test(l)) ? out : [];
}

/** Word "Designações": "Ancião: Nome — Cong." seguido de "Sua designação: Parte Nº 10 · 14:59". */
export function designacoesRows(lines: string[]): SpeakerRow[] {
  const out: SpeakerRow[] = [];
  let who: { name: string; cong: string | null } | null = null;
  for (const l of lines) {
    const a = l.match(/^(?:ancião|orador|irmão)\s*:\s*(.+)$/i);
    if (a) { const [n, ...c] = a[1].split(/\s[—–-]\s/); who = { name: cleanName(n), cong: cleanCong(c.join(" - ")) }; continue; }
    const d = l.match(/^sua designa[çc][ãa]o\s*:\s*(.+)$/i);
    if (!d || !who) continue;
    const time = d[1].match(/\b(\d{1,2}:\d{2})\b/)?.[1] ?? null;
    const n = d[1].match(/parte\s*n[º°o.]?\s*(\d{1,3})/i);
    const role: SpeakerRole = n ? "talk" : roleOf(d[1]);
    pushRow(out, { number: n ? normNum(n[1]) : "", speaker: who.name, congregation: who.cong, role, time, label: d[1].split("·")[0].trim() });
    who = null;
  }
  return out;
}

const isChairPart = (p: PartLike) => p.part_type_label === "Presidência do programa" || (!p.outline_number && CHAIR_RE.test(p.theme));
const isPrayerPart = (p: PartLike) => p.part_type_label === "Oração" || (!p.outline_number && /^ora[çc][ãa]o\b/i.test(p.theme.trim()));
const minutes = (t: string | null | undefined) => { const m = (t ?? "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

/** Situação de uma linha ligada a uma parte (usada também quando o usuário troca o destino). */
export function classify(row: SpeakerRow, part: PartLike | null): { kind: MatchKind; checked: boolean } {
  if (!part) return { kind: "missing", checked: false };
  const cur = part.speaker_name?.trim();
  if (!cur) return { kind: "new", checked: true };
  if (normalizeName(cur) === normalizeName(row.speaker)) {
    const congDiff = !!row.congregation && normalizeName(row.congregation) !== normalizeName(part.speaker_congregation ?? "");
    return { kind: "same", checked: congDiff };
  }
  if (part.status === "confirmed") return { kind: "confirmed", checked: false };
  return { kind: "replace", checked: false };
}

/** Partes que podem receber um nome importado (orador, presidente, oração). */
export function assignableParts(parts: PartLike[]): PartLike[] {
  return parts.filter((p) => p.assigned_to === "speaker").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Liga discursos pelo Nº; presidente e oração pela sessão/horário mais próximo (ou ordem). */
export function matchSpeakers(rows: SpeakerRow[], parts: PartLike[]): SpeakerMatch[] {
  const byNum = new Map<string, PartLike>();
  for (const p of parts) {
    const k = normNum(p.outline_number);
    if (k && p.assigned_to === "speaker" && !byNum.has(k)) byNum.set(k, p);
  }
  const used = new Set<string>();
  const pick = (row: SpeakerRow, pool: PartLike[]) => {
    const free = pool.filter((p) => !used.has(p.id));
    if (!free.length) return null;
    const t = minutes(row.time);
    if (t == null) return free[0];
    const pm = t >= 12 * 60 + 30;
    const same = free.filter((p) => { const m = minutes(p.part_time); return m == null || (m >= 12 * 60 + 30) === pm; });
    const list = same.length ? same : free;
    return [...list].sort((a, b) => Math.abs((minutes(a.part_time) ?? t) - t) - Math.abs((minutes(b.part_time) ?? t) - t))[0];
  };
  const sp = assignableParts(parts);
  return rows.map((row) => {
    let part: PartLike | null;
    if (row.role === "chair") part = pick(row, sp.filter(isChairPart));
    else if (row.role === "prayer") part = pick(row, sp.filter(isPrayerPart));
    else part = byNum.get(row.number) ?? null;
    if (part && used.has(part.id)) part = null;
    if (part) used.add(part.id);
    return { row, part, ...classify(row, part) };
  });
}

/** Troca o destino da linha i para a parte `partId`; se outra linha usava essa parte, as duas trocam. */
export function retarget(items: SpeakerMatch[], i: number, part: PartLike | null): SpeakerMatch[] {
  const prev = items[i].part;
  return items.map((m, j) => {
    if (j === i) return { ...m, part, ...classify(m.row, part), swapped: false };
    if (part && m.part?.id === part.id) return { ...m, part: prev, ...classify(m.row, prev), swapped: true };
    return m;
  });
}

/** Rótulo curto de uma parte no seletor "Vai para". */
export function partLabel(p: PartLike): string {
  if (normNum(p.outline_number)) return `Nº ${normNum(p.outline_number)} · ${p.theme}`;
  return [p.part_time, p.part_type_label ?? p.theme].filter(Boolean).join(" · ");
}
