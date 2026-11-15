// Recuo da primeira linha (igual ao Word), separado do recuo de bloco.
export const FIRST_LINE_MAX = 4;
export const FIRST_LINE_STEP = 32;

export interface FirstLineAttrs {
  indent?: number;
  firstLine?: number;
}

/** Lê o degrau de 1ª linha de um parágrafo (só text-indent positivo). */
export function firstLineFromElement(el: { style: { textIndent: string } }): number {
  const px = parseFloat(el.style.textIndent) || 0;
  if (px <= 0) return 0;
  return Math.min(FIRST_LINE_MAX, Math.max(1, Math.round(px / FIRST_LINE_STEP)));
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
