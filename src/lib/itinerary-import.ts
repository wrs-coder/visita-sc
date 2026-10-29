// Importação do itinerário a partir de .ics e .csv (formato Circuit Assistant e planilhas simples).
// Tudo puro e no aparelho: só lê o arquivo e monta linhas para a tela de revisão.

export type ImportKind = "visit" | "pioneer" | "free";
export interface ImportRow {
  kind: ImportKind;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd (inclusivo)
  /** Nome da congregação no arquivo (visitas) ou nome do evento (semanas livres). */
  label: string;
  training?: boolean;
  note?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Remove acentos, "Cong.", zeros à esquerda e pontuação, para comparar nomes. */
export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bcongrega(cao|tion)\b|\bcong\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b0+(\d)/g, "$1")
    .replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Semelhança 0–100 entre dois nomes já normalizados. Números diferentes ("Funda 1" x "Funda 2") nunca passam de 40. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const numsA = a.match(/\d+/g)?.join(",") ?? "";
  const numsB = b.match(/\d+/g)?.join(",") ?? "";
  let score = Math.round((1 - levenshtein(a, b) / Math.max(a.length, b.length)) * 100);
  const wa = a.split(" "), wb = b.split(" ");
  if (numsA === numsB && (wa.every((w) => wb.includes(w)) || wb.every((w) => wa.includes(w)))) score = Math.max(score, 90);
  if (numsA !== numsB) score = Math.min(score, 40);
  return score;
}

export const STRONG = 85;
export const MEDIUM = 50;

export function matchCongregation<T extends { id: string; name: string }>(label: string, congs: T[], aliases: Record<string, string> = {}): { id: string | null; score: number } {
  const n = normalizeName(label);
  const alias = aliases[n];
  if (alias && congs.some((c) => c.id === alias)) return { id: alias, score: 100 };
  let best: { id: string | null; score: number } = { id: null, score: 0 };
  for (const c of congs) {
    const s = similarity(n, normalizeName(c.name));
    if (s > best.score) best = { id: c.id, score: s };
  }
  return best.score >= MEDIUM ? best : { id: null, score: best.score };
}

// ---------- .ics ----------

function unescapeIcs(s: string) {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

function icsDate(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Classifica o título de um evento: visita à congregação ou outra semana. */
export function classifySummary(summary: string): Pick<ImportRow, "kind" | "label" | "training"> {
  const s = summary.replace(/\s+/g, " ").trim();
  const visit = /^\(\s*visita[^)]*\)\s*-\s*(.+)$/i.exec(s);
  if (visit) {
    const training = /trein/i.test(s.slice(0, s.indexOf(")") + 1));
    const name = visit[1].split(/\s+-\s+/)[0].trim();
    return { kind: "visit", label: name, training };
  }
  const label = s.replace(/^servi[cç]o de circuito\s*:\s*/i, "").replace(/\s*\(.*$/, "").trim() || s;
  return /pioneir/i.test(label) ? { kind: "pioneer", label: "Semana de pioneiro" } : { kind: "free", label };
}

export function parseIcs(text: string): ImportRow[] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const rows: ImportRow[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur?.SUMMARY && cur.DTSTART) {
        const start = icsDate(cur.DTSTART);
        let end = cur.DTEND ? icsDate(cur.DTEND) : start;
        // Dia inteiro: DTEND é exclusivo.
        if (end && cur.DTEND && !cur.DTEND.includes("T") && end > start!) end = addDays(end, -1);
        if (start && end) rows.push({ ...classifySummary(unescapeIcs(cur.SUMMARY)), start, end });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).split(";")[0].toUpperCase();
    if (key === "SUMMARY" || key === "DTSTART" || key === "DTEND") cur[key] = line.slice(i + 1);
  }
  return rows.sort((a, b) => a.start.localeCompare(b.start));
}

// ---------- .csv ----------

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function parseOneDate(s: string): { d: number; m?: number; y?: number } | null {
  const t = strip(s);
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return { d: +m[1], m: +m[2], y: +m[3] };
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return { d: +m[3], m: +m[2], y: +m[1] };
  m = /^(\d{1,2})(?: de ([a-z]+))?(?: de (\d{4}))?$/.exec(t);
  if (m) { const mm = m[2] ? MONTHS[m[2]] : undefined; if (m[2] && !mm) return null; return { d: +m[1], m: mm, y: m[3] ? +m[3] : undefined }; }
  return null;
}

/** "13 a 18 de outubro de 2026", "27 de outubro a 01 de novembro de 2026", "29/12/2026 a 03/01/2027". */
export function parseDateRange(s: string): { start: string; end: string } | null {
  const parts = s.split(/\s+(?:a|até|-|–)\s+/i);
  if (parts.length !== 2) { const one = parseOneDate(s); return one?.m && one.y ? { start: iso(one.y, one.m, one.d), end: iso(one.y, one.m, one.d) } : null; }
  const a = parseOneDate(parts[0]), b = parseOneDate(parts[1]);
  if (!a || !b || !b.m || !b.y) return null;
  const am = a.m ?? b.m;
  const ay = a.y ?? (am > b.m ? b.y - 1 : b.y);
  return { start: iso(ay, am, a.d), end: iso(b.y, b.m, b.d) };
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCsv(text: string): ImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCsvLine(lines[0], sep).map(strip);
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const iRange = col("data completa", "semana", "periodo", "datas");
  const iStart = col("data inicio", "inicio", "data de inicio");
  const iEnd = col("data fim", "fim", "data final", "data de fim");
  const iType = col("tipo");
  const iCong = col("congregacao", "congregation");
  const iScheme = col("esquema", "observacao", "notas");
  if (iCong < 0 || (iRange < 0 && iStart < 0)) throw new Error("Colunas não reconhecidas. Use: Congregação e Data Completa (ou Data Início / Data Fim).");
  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line, sep);
    let range: { start: string; end: string } | null = null;
    if (iRange >= 0 && c[iRange]) range = parseDateRange(c[iRange]);
    else if (iStart >= 0) {
      const a = parseDateRange(c[iStart] ?? ""), b = iEnd >= 0 ? parseDateRange(c[iEnd] ?? "") : null;
      if (a) range = { start: a.start, end: b?.end ?? a.end };
    }
    if (!range) continue;
    const type = iType >= 0 ? (c[iType] ?? "").trim() : "";
    const cong = (c[iCong] ?? "").trim();
    const scheme = iScheme >= 0 ? (c[iScheme] ?? "").trim() : "";
    const isVisit = type ? /visita/i.test(type) : !!cong;
    if (isVisit) rows.push({ kind: "visit", ...range, label: cong, training: /trein/i.test(scheme) || /trein/i.test(type), note: scheme || undefined });
    else if (/pioneir/i.test(type)) rows.push({ kind: "pioneer", ...range, label: "Semana de pioneiro", note: scheme || undefined });
    else rows.push({ kind: "free", ...range, label: type || cong || "Semana livre", note: scheme || undefined });
  }
  return rows.sort((a, b) => a.start.localeCompare(b.start));
}

export function parseItineraryFile(name: string, text: string): ImportRow[] {
  if (/\.ics$/i.test(name) || /BEGIN:VCALENDAR/.test(text.slice(0, 200))) return parseIcs(text);
  return parseCsv(text);
}

// ---------- conflitos ----------

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

/** Devolve um aviso se a linha já existe ou colide com algo cadastrado. */
export function findConflict(
  row: { kind: ImportKind; start: string; end: string; congregationId?: string | null },
  visits: Array<{ start_date: string; end_date: string; congregation_id: string }>,
  weeks: Array<{ start_date: string; end_date: string }>,
  congName: (id: string) => string,
): { exists: boolean; text: string } | null {
  for (const v of visits) {
    if (!overlaps(row, { start: v.start_date, end: v.end_date })) continue;
    const same = row.kind === "visit" && v.congregation_id === row.congregationId;
    return { exists: same, text: `Já existe: ${congName(v.congregation_id)} ${v.start_date.slice(8, 10)}/${v.start_date.slice(5, 7)}` };
  }
  for (const w of weeks) {
    if (overlaps(row, { start: w.start_date, end: w.end_date })) return { exists: row.kind !== "visit", text: `Já existe semana sem visita ${w.start_date.slice(8, 10)}/${w.start_date.slice(5, 7)}` };
  }
  return null;
}
