// Decide se um toque num versículo é um "toque" de verdade ou parte de uma rolagem.
export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_MS = 600;

export type TapStart = { x: number; y: number; t: number; scroll: number };
export type TapEnd = { x: number; y: number; t: number; scroll: number; hasSelection: boolean };

export function isRealTap(start: TapStart | null, end: TapEnd): boolean {
  if (end.hasSelection) return true; // seleção de trecho com o dedo sempre conta
  if (!start) return false;
  if (Math.hypot(end.x - start.x, end.y - start.y) > TAP_MAX_MOVE_PX) return false;
  if (Math.abs(end.scroll - start.scroll) > 2) return false;
  if (end.t - start.t > TAP_MAX_MS) return false;
  return true;
}
