/**
 * Cores do marca-texto do editor e conversão das cores do Word
 * (w:highlight e sombreamento w:shd) para essa mesma paleta.
 */
export const HIGHLIGHT_COLORS = [
  "#fef08a", "#fecaca", "#bbf7d0", "#bae6fd",
  "#ddd6fe", "#fbcfe8", "#fed7aa", "#e5e7eb",
] as const;

export const DEFAULT_HIGHLIGHT = HIGHLIGHT_COLORS[0];

const WORD_HIGHLIGHT: Record<string, string> = {
  yellow: "#fef08a",
  darkyellow: "#fed7aa",
  green: "#bbf7d0",
  darkgreen: "#bbf7d0",
  cyan: "#bae6fd",
  darkcyan: "#bae6fd",
  blue: "#bae6fd",
  darkblue: "#ddd6fe",
  magenta: "#fbcfe8",
  darkmagenta: "#ddd6fe",
  red: "#fecaca",
  darkred: "#fecaca",
  lightgray: "#e5e7eb",
  darkgray: "#e5e7eb",
};

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsl([r, g, b]: [number, number, number]): { h: number; s: number; l: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/**
 * Cor da paleta mais próxima de um hexadecimal (#rrggbb ou rrggbb), pelo
 * matiz (amarelo, verde, azul…), porque o Word usa tons fortes e a paleta
 * do editor usa tons claros do mesmo matiz. Cinzas viram o cinza da paleta.
 */
export function nearestHighlight(hex: string): string | null {
  const c = rgb(hex);
  if (!c) return null;
  // Branco/quase branco não é destaque.
  if (c[0] > 245 && c[1] > 245 && c[2] > 245) return null;
  const { h, s } = hsl(c);
  const gray = HIGHLIGHT_COLORS[HIGHLIGHT_COLORS.length - 1];
  if (s < 0.15) return gray;
  let best: string = DEFAULT_HIGHLIGHT;
  let bestD = Infinity;
  for (const p of HIGHLIGHT_COLORS) {
    if (p === gray) continue;
    const ph = hsl(rgb(p)!).h;
    const d = Math.min(Math.abs(h - ph), 360 - Math.abs(h - ph));
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Nome de marca-texto do Word (yellow, green…) → cor da paleta; desconhecida = amarelo. */
export function wordHighlightToColor(name: string | null | undefined): string | null {
  const k = (name ?? "").trim().toLowerCase();
  if (!k || k === "none" || k === "white" || k === "auto") return null;
  return WORD_HIGHLIGHT[k] ?? DEFAULT_HIGHLIGHT;
}
