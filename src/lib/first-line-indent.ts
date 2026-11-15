// Recuo da primeira linha e recuo deslocado (iguais ao Word), separados do
// recuo de bloco. Um único atributo `firstLine` guarda os dois:
//   > 0  → 1ª linha mais para dentro (text-indent positivo, degraus de 32px)
//   < 0  → deslocado: 1ª linha na margem e as seguintes mais para dentro
//          (padding-left + text-indent negativo, degraus de 16px)
export const FIRST_LINE_MAX = 4;
export const FIRST_LINE_STEP = 32;
export const HANG_MAX = 4;
export const HANG_STEP = 16;

export interface FirstLineAttrs {
  indent?: number;
  firstLine?: number;
}

export type FirstLineMode = "none" | "first" | "hanging";

/** Lê o degrau de um parágrafo: positivo = 1ª linha, negativo = deslocado. */
export function firstLineFromElement(el: { style: { textIndent: string } }): number {
  const px = parseFloat(el.style.textIndent) || 0;
  if (px >= 1) return Math.min(FIRST_LINE_MAX, Math.max(1, Math.round(px / FIRST_LINE_STEP)));
  if (px <= -4) return -Math.min(HANG_MAX, Math.max(1, Math.round(-px / HANG_STEP)));
  return 0;
}

/** Estilo inline do atributo firstLine (o mesmo no editor e nas exportações). */
export function firstLineStyle(firstLine: number): string {
  const lvl = Math.trunc(Number(firstLine) || 0);
  if (lvl > 0) return `text-indent: ${Math.min(FIRST_LINE_MAX, lvl) * FIRST_LINE_STEP}px`;
  if (lvl < 0) {
    const px = Math.min(HANG_MAX, -lvl) * HANG_STEP;
    return `padding-left: ${px}px; text-indent: -${px}px`;
  }
  return "";
}

export function firstLineMode(firstLine: number | undefined): FirstLineMode {
  const v = Number(firstLine) || 0;
  return v > 0 ? "first" : v < 0 ? "hanging" : "none";
}

/**
 * Liga/desliga o recuo da 1ª linha. Ao ligar num parágrafo que só tinha recuo
 * de bloco (notas antigas coladas do Word), o bloco vira recuo de 1ª linha.
 */
export function nextFirstLine(attrs: FirstLineAttrs, turnOn: boolean): FirstLineAttrs {
  const indent = Number(attrs.indent) || 0;
  if (!turnOn) return { indent, firstLine: 0 };
  if (indent > 0) return { indent: 0, firstLine: Math.min(FIRST_LINE_MAX, indent) };
  return { indent, firstLine: 1 };
}

/** Ciclo do botão: Normal → 1ª linha → Deslocado → Normal. */
export function cycleFirstLine(attrs: FirstLineAttrs): FirstLineAttrs {
  const indent = Number(attrs.indent) || 0;
  const cur = Number(attrs.firstLine) || 0;
  if (cur > 0) return { indent, firstLine: -1 };
  if (cur < 0) return { indent, firstLine: 0 };
  return nextFirstLine(attrs, true);
}
