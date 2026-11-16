/** Posição da boia do cronômetro no Modo Esboço (preferência do aparelho). */
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

export function loadFloatPos(): FloatPos | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && (v.side === "left" || v.side === "right") && typeof v.y === "number") return v;
  } catch { /* noop */ }
  return null;
}
export function saveFloatPos(p: FloatPos) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ }
}
