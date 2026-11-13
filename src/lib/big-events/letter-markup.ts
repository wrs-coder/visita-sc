// Marcação leve das caixas da carta: **negrito**, *itálico*, ==destaque==, linha "• " = marcador.
// Fica dentro do próprio texto do modelo, então o formato salvo e o sync não mudam.
export interface Run { text: string; bold: boolean; italic: boolean; mark: boolean }

/** Quebra uma linha em trechos com estilo. Marcadores sem par ficam como texto. */
export function parseRuns(line: string): Run[] {
  const out: Run[] = [];
  const st = { bold: false, italic: false, mark: false };
  let buf = "";
  const push = () => { if (buf) { out.push({ text: buf, ...st }); buf = ""; } };
  const closes = (tok: string, from: number) => line.indexOf(tok, from) >= 0;
  for (let i = 0; i < line.length; ) {
    const two = line.slice(i, i + 2);
    if (two === "**" && (st.bold || closes("**", i + 2))) { push(); st.bold = !st.bold; i += 2; continue; }
    if (two === "==" && (st.mark || closes("==", i + 2))) { push(); st.mark = !st.mark; i += 2; continue; }
    if (line[i] === "*" && (st.italic || closes("*", i + 1))) { push(); st.italic = !st.italic; i += 1; continue; }
    buf += line[i]; i++;
  }
  push();
  return out;
}

const BULLET = /^\s*[•\-–]\s+/;
/** Linha com marcador? Devolve o texto sem o símbolo. */
export function bulletOf(line: string): string | null {
  return BULLET.test(line) ? line.replace(BULLET, "") : null;
}

/** Texto puro (para Word e prévias): remove a marcação. */
export function stripMarkup(s: string): string {
  return s.split("\n").map((l) => parseRuns(l).map((r) => r.text).join("")).join("\n");
}

/** Envolve a seleção com um marcador (ou tira, se já estiver envolvida). */
export function toggleWrap(value: string, start: number, end: number, tok: string): { value: string; start: number; end: number } {
  const sel = value.slice(start, end);
  const before = value.slice(Math.max(0, start - tok.length), start), after = value.slice(end, end + tok.length);
  if (before === tok && after === tok) {
    return { value: value.slice(0, start - tok.length) + sel + value.slice(end + tok.length), start: start - tok.length, end: end - tok.length };
  }
  return { value: value.slice(0, start) + tok + sel + tok + value.slice(end), start: start + tok.length, end: end + tok.length };
}

/** Liga/desliga "• " no começo de cada linha tocada pela seleção. */
export function toggleBullets(value: string, start: number, end: number): { value: string; start: number; end: number } {
  const ls = value.lastIndexOf("\n", start - 1) + 1;
  let le = value.indexOf("\n", end); if (le < 0) le = value.length;
  const lines = value.slice(ls, le).split("\n");
  const all = lines.every((l) => bulletOf(l) !== null || !l.trim());
  const next = lines.map((l) => (!l.trim() ? l : all ? (bulletOf(l) ?? l) : bulletOf(l) !== null ? l : `• ${l}`)).join("\n");
  return { value: value.slice(0, ls) + next + value.slice(le), start: ls, end: ls + next.length };
}
