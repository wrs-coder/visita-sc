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

/** Uma linha de texto → { número, orador, congregação } ou null. */
export function parseLine(line: string, themes: string[] = []): SpeakerRow | null {
  let fields = line.split(SPLIT_RE).map((f) => f.trim()).filter(Boolean);
  if (!fields.length) return null;
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
  if (!speaker || /\d{3,}/.test(speaker)) return null;
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

async function pdfToLines(buf: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 60); n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const rows = new Map<number, Array<{ x: number; w: number; s: string }>>();
    for (const it of content.items as Array<{ str?: string; transform?: number[]; width?: number }>) {
      if (!it.str?.trim() || !it.transform) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      (rows.get(y) ?? rows.set(y, []).get(y)!).push({ x: it.transform[4], w: it.width ?? 0, s: it.str });
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const items = rows.get(y)!.sort((a, b) => a.x - b.x);
      let line = "", end = -Infinity;
      for (const i of items) { line += line ? (i.x - end > 12 ? "\t" : " ") + i.s : i.s; end = i.x + i.w; }
      lines.push(line.replace(/ {2,}/g, " "));
    }
  }
  await doc.cleanup?.();
  if (!lines.length) throw new Error("Este PDF não tem texto (parece digitalizado).");
  return lines;
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
  if (ext === "pdf") return pdfToLines(buf);
  throw new Error("Formato não aceito. Use .csv, .xlsx, .docx ou .pdf.");
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
