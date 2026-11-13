// Importação de congregações a partir de .csv (JW.org), .docx ou .xlsx.
// Tudo roda no aparelho; o arquivo é tratado como entrada não confiável.
import JSZip from "jszip";

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const IMPORT_MAX_UNZIPPED = 50 * 1024 * 1024;

export type FoundCongregation = {
  name: string;          // nome sem o número
  number: string | null; // número da congregação (entre parênteses)
  likelyTitle: boolean;  // parece título/cabeçalho → vem desmarcado
};

export type ParsedImport = { items: FoundCongregation[]; circuit: string | null };

const NUM_RE = /\((\d{3,6})\)/;

export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** "Cabiri  (18911)" ou "(18911) Cabiri" → { name, number }. */
export function splitNumber(raw: string): { name: string; number: string | null } {
  const m = raw.match(NUM_RE);
  const name = raw.replace(NUM_RE, " ").replace(/\s+/g, " ").replace(/^[\s\-–·:]+|[\s\-–·]+$/g, "").trim();
  return { name, number: m ? m[1] : null };
}

export function looksLikeTitle(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (t.endsWith(":")) return true;
  if (/congrega[cç][oõ]es/i.test(t)) return true;
  const letters = t.replace(/[^\p{L}]/gu, "");
  return letters.length >= 4 && letters === letters.toUpperCase() && !NUM_RE.test(t);
}

/** Linhas soltas → lista sem duplicadas. */
export function linesToItems(lines: string[]): FoundCongregation[] {
  const seen = new Set<string>();
  const out: FoundCongregation[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || line.length > 120) continue;
    const { name, number } = splitNumber(line);
    if (name.length < 2) continue;
    const key = normalizeName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, number, likelyTitle: looksLikeTitle(line) });
  }
  return out;
}

/** CSV simples com aspas (campos podem ter quebra de linha). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  const src = text.replace(/^\uFEFF/, "");
  const delim = (src.split("\n")[0].match(/;/g)?.length ?? 0) > (src.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function parseCsv(text: string): ParsedImport {
  const rows = parseCsvRows(text);
  if (!rows.length) return { items: [], circuit: null };
  const head = rows[0].map(normalizeName);
  const iName = head.findIndex((h) => h === "congregacao" || h === "congregation" || h === "nome");
  if (iName < 0) return { items: linesToItems(rows.map((r) => r[0] ?? "")), circuit: null };
  const iNum = head.findIndex((h) => h.startsWith("numero da congregacao") || h === "numero");
  const iCirc = head.findIndex((h) => h === "circuito" || h === "circuit");
  const lines = rows.slice(1).map((r) => {
    const n = (r[iName] ?? "").trim();
    const num = iNum >= 0 ? (r[iNum] ?? "").trim() : "";
    return num && /^\d{3,6}$/.test(num) && !NUM_RE.test(n) ? `${n} (${num})` : n;
  });
  const circuit = iCirc >= 0 ? (rows.slice(1).map((r) => (r[iCirc] ?? "").trim()).find(Boolean) ?? null) : null;
  return { items: linesToItems(lines), circuit };
}

export function decodeXml(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
}

export async function openZip(buf: ArrayBuffer): Promise<JSZip> {
  const zip = await JSZip.loadAsync(buf);
  let total = 0, entries = 0;
  zip.forEach((_p, f) => {
    entries++;
    total += (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
  });
  if (entries > 2000 || total > IMPORT_MAX_UNZIPPED) throw new Error("Arquivo grande demais.");
  return zip;
}

export function rejectUnsafe(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Arquivo inválido.");
}

export function docxXmlToLines(xml: string): string[] {
  rejectUnsafe(xml);
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map((p) =>
    decodeXml((p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
}

export function xlsxToLines(sharedXml: string, sheetXml: string): string[] {
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
    const text = cells.filter((x) => x.trim()).join(" ");
    if (text) lines.push(text);
  }
  return lines;
}

export async function parseCongregationFile(file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer>; text?: () => Promise<string> }): Promise<ParsedImport> {
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Arquivo grande demais (máx. 10 MB).");
  const ext = file.name.toLowerCase().split(".").pop();
  const buf = await file.arrayBuffer();
  if (ext === "csv" || ext === "txt") return parseCsv(new TextDecoder("utf-8").decode(buf));
  if (ext === "docx") {
    const zip = await openZip(buf);
    if (Object.keys(zip.files).some((p) => /vbaProject/i.test(p))) throw new Error("Arquivo com macros não é aceito.");
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("Não parece um arquivo Word.");
    return { items: linesToItems(docxXmlToLines(xml)), circuit: null };
  }
  if (ext === "xlsx") {
    const zip = await openZip(buf);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    if (!sheet) throw new Error("Não parece uma planilha Excel.");
    const shared = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
    return { items: linesToItems(xlsxToLines(shared, sheet)), circuit: null };
  }
  throw new Error("Formato não aceito. Use .csv, .docx ou .xlsx.");
}

/** Código de 5 números, diferente de todos os já usados. */
export function generateCode(used: Set<string>): string {
  const buf = new Uint32Array(1);
  for (let i = 0; i < 500; i++) {
    crypto.getRandomValues(buf);
    const code = String(10000 + (buf[0] % 90000));
    if (!used.has(code)) return code;
  }
  return String(Date.now()).slice(-6);
}

export const CODE_RE = /^[A-Z0-9]{4,6}$/;

export function displayName(name: string, number: string | null, keepNumber: boolean): string {
  return keepNumber && number ? `${name} (${number})` : name;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** HTML simples para o Word exportado: uma congregação por linha, com divisórias. */
export function congregationsExportHtml(list: { name: string; invite_code: string }[], dateLabel: string): string {
  const rows = [...list].sort((a, b) => a.name.localeCompare(b.name, "pt")).map((c, i) => {
    const { name, number } = splitNumber(c.name);
    const num = number ? ` · Nº ${number}` : "";
    return `<p>${i + 1}. <b>${escapeHtml(name)}</b>${num} · Código: <b>${escapeHtml(c.invite_code)}</b></p>`;
  }).join("");
  return `<p>Gerado em ${escapeHtml(dateLabel)}</p><hr data-divider="1">${rows}<hr data-divider="1"><p>Total: ${list.length} congregações</p>`;
}
