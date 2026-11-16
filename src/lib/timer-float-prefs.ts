/** Posição das boias flutuantes (cronômetro, anexos) — preferência do aparelho, uma chave por boia. */
export interface FloatPos { side: "left" | "right"; y: number }
const KEY = "outlineTimer.floatPos";
export const FLOAT_MARGIN = 8;

/** Prende à borda mais próxima e limita o Y à área visível. */
export function snapFloat(x: number, y: number, w: number, h: number, vw: number, vh: number, top = 0): FloatPos {
  const side = x + w / 2 < vw / 2 ? "left" : "right";
  const minY = top + FLOAT_MARGIN;
  const maxY = Math.max(minY, vh - h - FLOAT_MARGIN);
  return { side, y: Math.round(Math.min(maxY, Math.max(minY, y))) };
}

export function loadFloatPos(key: string = KEY): FloatPos | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    if (v && (v.side === "left" || v.side === "right") && typeof v.y === "number") return v;
  } catch { /* noop */ }
  return null;
}
export function saveFloatPos(p: FloatPos, key: string = KEY) {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* noop */ }
}
