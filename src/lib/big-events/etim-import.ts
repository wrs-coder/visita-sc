// Leitura de arquivos .etim (JSON com partes "circuitEventPart") de assembleias.
// Arquivo é entrada não confiável: limite de tamanho, validação campo a campo.

export const ETIM_MAX_BYTES = 1024 * 1024;

export type AssignedTo = "speaker" | "co" | "branch" | "none";

export interface EtimPart {
  part_time: string | null;
  duration_min: number | null;
  theme: string;
  outline_number: string | null;
  instructions: string | null;
  part_type_id: string | null;
  part_type_label: string | null;
  symposium: boolean;
  talk_includes: string[];
  assigned_to: AssignedTo;
  /** Só quando o arquivo já traz o designado (CSV do Circuito Manager). */
  speaker_name?: string | null;
}

const str = (v: unknown, max = 500): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** Quem faz a parte: SC, filial, ninguém (cântico) ou um orador convidado. */
export function assignedFor(raw: Record<string, unknown>): AssignedTo {
  if (raw.partCOTalk === true || raw.partSharedCO === true) return "co";
  if (raw.partBranchRep === true) return "branch";
  const type = (raw.partType as { id?: unknown } | null)?.id;
  if (type === "Song") return "none";
  return "speaker";
}

export function parseEtim(text: string): EtimPart[] {
  if (text.length > ETIM_MAX_BYTES) throw new Error("Arquivo muito grande (máx. 1 MB).");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("Arquivo .etim inválido."); }
  let list: unknown = data;
  if (!Array.isArray(list) && list && typeof list === "object") {
    const o = list as Record<string, unknown>;
    list = Array.isArray(o.circuitEventPart) ? o.circuitEventPart : Array.isArray(o.parts) ? o.parts : null;
  }
  if (!Array.isArray(list)) throw new Error("Não encontrei partes neste arquivo. Use o .etim ou o arquivo do Circuito Manager (.json ou .csv).");
  const parts: EtimPart[] = [];
  for (const item of list.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (r.type !== undefined && r.type !== "circuitEventPart") continue;
    const pt = (r.partType && typeof r.partType === "object" ? r.partType : null) as Record<string, unknown> | null;
    const dur = typeof r.partDurationInMinutes === "number" && Number.isFinite(r.partDurationInMinutes)
      ? Math.max(0, Math.min(600, Math.round(r.partDurationInMinutes))) : null;
    const time = str(r.partTime, 5);
    parts.push({
      part_time: time && /^\d{1,2}:\d{2}$/.test(time) ? time : null,
      duration_min: dur,
      theme: str(r.partTheme, 300) ?? str(pt?.label, 120) ?? "",
      outline_number: r.partOutlineNumber == null ? null : String(r.partOutlineNumber).slice(0, 20),
      instructions: str(r.partInstructions, 2000),
      part_type_id: str(pt?.id, 40),
      part_type_label: str(pt?.label, 120),
      symposium: r.symposium === true,
      talk_includes: Array.isArray(r.talkIncludes) ? r.talkIncludes.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
      assigned_to: assignedFor(r),
    });
  }
  if (!parts.length) throw new Error("Nenhuma parte encontrada no arquivo.");
  return parts;
}

/** Programa exportado pelo Circuito Manager (JSON com "Programas"). */
export function parseCircuitManager(data: Record<string, unknown>): EtimPart[] {
  const list = data.Programas;
  if (!Array.isArray(list)) throw new Error("Arquivo sem programa.");
  const parts: EtimPart[] = [];
  let series: string | null = null;
  for (const item of list.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (r.Exibir === false) continue;
    const num = typeof r.Numero === "number" ? Math.round(r.Numero) : 0;
    const raw = str(r.Tema, 300) ?? "";
    const dur = typeof r.Duracao === "number" && Number.isFinite(r.Duracao) ? Math.max(0, Math.min(600, Math.round(r.Duracao))) : 0;
    const tm = /^(\d{1,2}):(\d{2})/.exec(typeof r.Inicio === "string" ? r.Inicio : "");
    const time = tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : null;
    const bullet = /^[•·\-–]\s*/.test(raw);
    const theme = raw.replace(/^[•·\-–]\s*/, "").trim();
    if (num <= 0) {
      const sm = /^série de discursos:\s*(.+)$/i.exec(theme);
      if (sm) { series = sm[1].trim(); continue; }
      series = null;
      if (/c[âa]ntico|ora[çc][ãa]o/i.test(theme)) {
        parts.push({ part_time: time, duration_min: dur || null, theme, outline_number: null, instructions: null,
          part_type_id: "Song", part_type_label: null, symposium: false, talk_includes: [], assigned_to: "none" });
      }
      continue;
    }
    const inSeries = bullet && !!series;
    if (!bullet) series = null;
    const part = String(r.Participacao ?? "").toUpperCase();
    const label = /batismo/i.test(theme) ? "Discurso Batismo"
      : /discurso para o p[úu]blico|discurso p[úu]blico/i.test(theme) ? "Discurso Público"
      : /sentinela/i.test(theme) ? "A Sentinela"
      : inSeries ? "Simpósio"
      : part === "ENT" ? "Entrevistas" : "Discurso";
    parts.push({
      part_time: time, duration_min: dur || null,
      theme: inSeries ? `${series} — ${theme}` : theme,
      outline_number: String(num), instructions: null, part_type_id: null, part_type_label: label,
      symposium: inSeries, talk_includes: part === "ENT" ? ["Entrevistas"] : [], assigned_to: "speaker",
      ...(str(r.Designado, 200) ? { speaker_name: str(r.Designado, 200) } : {}),
    });
  }
  if (!parts.some((p) => p.assigned_to === "speaker")) throw new Error("Nenhuma parte encontrada no arquivo.");
  return parts;
}

export interface ProgramImport { format: "etim" | "circuit-manager"; title: string | null; parts: EtimPart[] }

/** Divide uma linha CSV respeitando aspas ("" = aspas literal). */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === "") q = true;
    else if (c === sep) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** CSV "Designações do Programa" do Circuito Manager → mesmas regras do .json. */
export function parseCircuitManagerCsv(text: string): EtimPart[] {
  const lines = text.replace(/^\uFEFF+/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("Arquivo CSV vazio.");
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCsvLine(lines[0], sep).map(norm);
  const col = (n: string) => head.indexOf(n);
  const iNum = col("numero"), iTema = col("designacao"), iIni = col("inicio"), iDur = col("duracao");
  const iPart = col("participacao"), iDes = col("designado");
  if (iNum < 0 || iTema < 0) throw new Error("Este CSV não é um programa do Circuito Manager.");
  const Programas = lines.slice(1, 400).map((l) => {
    const c = splitCsvLine(l, sep);
    const num = parseInt(c[iNum] ?? "", 10);
    const dur = parseFloat((c[iDur] ?? "").replace(",", "."));
    return {
      Numero: Number.isFinite(num) ? num : 0,
      Tema: c[iTema] ?? "",
      Inicio: iIni >= 0 ? c[iIni] ?? "" : "",
      Duracao: Number.isFinite(dur) ? dur : 0,
      Participacao: iPart >= 0 ? c[iPart] ?? "" : "",
      Designado: iDes >= 0 ? c[iDes] ?? "" : "",
    };
  });
  return parseCircuitManager({ Programas });
}

/** Lê bytes como UTF-8; se não for UTF-8 válido, usa Windows-1252 (Excel). */
export function decodeText(buf: ArrayBuffer): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { return new TextDecoder("windows-1252").decode(buf); }
}

/** Detecta o formato (.etim ou Circuito Manager) e devolve as partes. */
export function parseProgramFile(text: string): ProgramImport {
  const clean = text.replace(/^\uFEFF+/, "");
  if (clean.length > ETIM_MAX_BYTES) throw new Error("Arquivo muito grande (máx. 1 MB).");
  let data: unknown;
  try { data = JSON.parse(clean); } catch { throw new Error("Este arquivo não é um programa válido."); }
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as Record<string, unknown>).Programas)) {
    const o = data as Record<string, unknown>;
    const title = str(o.Tema, 200)?.replace(/^["“”']+|["“”']+$/g, "").trim() || null;
    return { format: "circuit-manager", title, parts: parseCircuitManager(o) };
  }
  return { format: "etim", title: null, parts: parseEtim(clean) };
}
