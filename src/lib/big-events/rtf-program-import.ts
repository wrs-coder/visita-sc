// Lê o programa da assembleia em .rtf (exportado do jw.org) e devolve as partes.
// Arquivo é entrada não confiável: tamanho limitado e só texto é extraído.
import type { EtimPart, ProgramImport } from "./etim-import";
import { SERIES_HEAD, SERIES_ITEM } from "./program-rules";

/** Converte RTF em texto simples (uma linha por parágrafo). */
export function rtfToText(rtf: string): string {
  let out = "";
  const stack: boolean[] = [];
  let skip = false;
  let uc = 1, pendingSkip = 0;
  for (let i = 0; i < rtf.length; i++) {
    const c = rtf[i];
    if (c === "{") {
      stack.push(skip);
      // Grupos de destino ({\*...}, fonttbl, colortbl, stylesheet, info, fldinst) não são texto.
      const rest = rtf.slice(i + 1, i + 14);
      if (/^\\\*|^\\(fonttbl|colortbl|stylesheet|info|fldinst|pict|header|footer)/.test(rest)) skip = true;
      continue;
    }
    if (c === "}") { skip = stack.pop() ?? false; continue; }
    if (c === "\\") {
      const n = rtf[i + 1];
      if (n === "\\" || n === "{" || n === "}") { if (!skip) out += n; i++; continue; }
      if (n === "'") { const h = rtf.slice(i + 2, i + 4); if (!skip && pendingSkip === 0) out += String.fromCharCode(parseInt(h, 16)); else if (pendingSkip) pendingSkip--; i += 3; continue; }
      const m = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i + 1, i + 40));
      if (!m) { i++; continue; }
      i += m[0].length;
      const word = m[1], arg = m[2] ? Number(m[2]) : null;
      if (skip) continue;
      if (word === "par" || word === "line") out += "\n";
      else if (word === "tab") out += " ";
      else if (word === "uc" && arg !== null) uc = arg;
      else if (word === "u" && arg !== null) { out += String.fromCharCode(arg < 0 ? arg + 65536 : arg); pendingSkip = uc; }
      continue;
    }
    if (c === "\r" || c === "\n") continue;
    if (skip) continue;
    if (pendingSkip > 0) { pendingSkip--; continue; }
    out += c;
  }
  return out.replace(/\u00A0/g, " ");
}

const NO_SPEAKER = /^(m[uú]sica|v[ií]deo musical|c[aâ]ntico|an[uú]ncios|ora[cç][aã]o|intervalo)/i;
const cleanQuotes = (s: string) => {
  let t = s.replace(/^["“”‘’']+|["“”‘’']+$/g, "").trim();
  const open = (t.match(/[“‘]/g) ?? []).length, close = (t.match(/[”’]/g) ?? []).length;
  if (open !== close) t = t.replace(/[“”‘’"]/g, "");
  return t.trim();
};
const TIME = /^(\d{1,2}):(\d{2})\s*(.+)$/;

/** Partes do programa: horário, tema e quem faz (cânticos e música sem orador). */
export function parseRtfProgram(rtf: string): ProgramImport {
  const lines = rtfToText(rtf).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const titleLines: string[] = [];
  type P = EtimPart & { min: number; series?: P; seriesChild?: boolean; seriesUsed?: boolean };
  const parts: P[] = [];
  let afternoon = false, started = false;
  for (const l of lines) {
    if (/^preste aten[cç][aã]o/i.test(l)) break;
    if (/^tarde$/i.test(l)) { afternoon = true; continue; }
    if (/^manh[aã]$/i.test(l)) { started = true; continue; }
    const m = TIME.exec(l);
    if (!m) {
      if (!started && !parts.length && titleLines.length < 2 && !l.startsWith("[")) titleLines.push(l);
      else if (parts.length && started) {
        const p = parts[parts.length - 1];
        const item = l.replace(/^[•·\-–]\s*/, "").trim();
        const series = p.series ?? (p.symposium && /^[•·\-–]/.test(l) ? p : null);
        if (series && /^[•·\-–]/.test(l) && item && parts.length <= 80) {
          // Série de discursos: o título fica (conta no programa) e cada marcador vira um discurso próprio,
          // com tema completo e tempo em branco (só informativo, não soma no programa).
          const base = series.theme.replace(/^s[eé]rie de discursos:\s*/i, "").trim() || series.theme;
          parts.push({ ...series, theme: `${base} — ${item}`.slice(0, 300), duration_min: null, talk_includes: [], series, seriesChild: true,
            part_time: null, part_type_id: SERIES_ITEM, symposium: true, assigned_to: "speaker", time_mode: "auto" });
        } else if ((p.assigned_to !== "none" || p.part_type_id === SERIES_HEAD) && p.talk_includes.length < 10) p.talk_includes.push(item.slice(0, 200));
      }
      continue;
    }
    started = true;
    let h = Number(m[1]); const mi = Number(m[2]);
    if (h > 23 || mi > 59) continue;
    if ((afternoon || h < 7) && h < 12) h += 12;
    const theme = cleanQuotes(m[3]).slice(0, 300);
    if (!theme) continue;
    const none = NO_SPEAKER.test(theme);
    parts.push({
      min: h * 60 + mi,
      part_time: `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`,
      duration_min: null, theme, outline_number: null, instructions: null,
      ...(/^s[eé]rie de discursos/i.test(theme)
        ? { part_type_id: SERIES_HEAD, part_type_label: "Simpósio", symposium: true, assigned_to: "none" as const }
        : { part_type_id: none ? "Song" : null, part_type_label: null, symposium: false, assigned_to: none ? "none" as const : "speaker" as const }),
      talk_includes: [],
    });
    if (parts.length > 80) break;
  }
  if (!parts.length) throw new Error("Não encontrei horários neste arquivo .rtf.");
  // Tempo de cada parte = até o próximo horário (os discursos da série não entram nessa conta).
  const timed = parts.filter((p) => !p.seriesChild);
  for (let i = 0; i < timed.length - 1; i++) { const d = timed[i + 1].min - timed[i].min; if (d > 0 && d <= 90) timed[i].duration_min = timed[i].assigned_to === "speaker" && d > 1 ? d - 1 : d; }
  // Os esboços vêm com 1 min a menos que o intervalo (10:15 → 10:25 = 9 min).
  const title = (titleLines[1] ?? titleLines[0] ?? "").split(/ — | - /)[0].replace(/^["“”']+|["“”']+$/g, "").trim().slice(0, 200) || null;
  return { format: "etim", title, parts: parts.map(({ min: _m, series: _s, seriesChild: _c, seriesUsed: _u, ...p }) => p) };
}
