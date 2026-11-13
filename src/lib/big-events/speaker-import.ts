// Importar oradores (Nº do esboço + orador + congregação) de .csv, .xlsx, .docx ou .pdf.
// Tudo roda no aparelho; o arquivo é entrada não confiável (limites e rejeição de DOCTYPE/macros).
import { IMPORT_MAX_BYTES, decodeXml, normalizeName, openZip, parseCsvRows, rejectUnsafe } from "@/lib/congregation-import";

export type SpeakerRow = { number: string; speaker: string; congregation: string | null };

type PartLike = {
  id: string; outline_number: string | null; theme: string; assigned_to: string;
  speaker_name: string | null; speaker_congregation?: string | null; status: string;
};

export type MatchKind = "new" | "same" | "replace" | "confirmed" | "missing";
export type SpeakerMatch = { row: SpeakerRow; part: PartLike | null; kind: MatchKind; checked: boolean };

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
  if (ext !== "pdf") return linesToRows(await readSpeakerFile(file), themes);
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Arquivo grande demais (máx. 10 MB).");
  const items = await pdfItems(await file.arrayBuffer());
  const table = runningProgramRows(items);
  const have = new Set(table.map((r) => r.number));
  return [...table, ...linesToRows(pdfItemsToLines(items), themes).filter((r) => !have.has(r.number))];
}

/** Liga cada linha ao discurso com o mesmo Nº. Só partes de orador; SC/Filial ficam de fora. */
export function matchSpeakers(rows: SpeakerRow[], parts: PartLike[]): SpeakerMatch[] {
  const byNum = new Map<string, PartLike>();
  for (const p of parts) {
    const k = normNum(p.outline_number);
    if (k && p.assigned_to === "speaker" && !byNum.has(k)) byNum.set(k, p);
  }
  return rows.map((row) => {
    const part = byNum.get(row.number) ?? null;
    if (!part) return { row, part, kind: "missing" as const, checked: false };
    const cur = part.speaker_name?.trim();
    if (!cur) return { row, part, kind: "new" as const, checked: true };
    if (normalizeName(cur) === normalizeName(row.speaker)) {
      const congDiff = !!row.congregation && normalizeName(row.congregation) !== normalizeName(part.speaker_congregation ?? "");
      return { row, part, kind: "same" as const, checked: congDiff };
    }
    if (part.status === "confirmed") return { row, part, kind: "confirmed" as const, checked: false };
    return { row, part, kind: "replace" as const, checked: false };
  });
}
