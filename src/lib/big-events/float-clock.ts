// Janelinha flutuante do Mini tempo: o relógio é desenhado num canvas e vira um "vídeo"
// que o navegador deixa por cima de outros apps (Picture-in-Picture). Só apresentação.
// O tamanho da janelinha é decidido pelo sistema a partir do formato da imagem:
// quanto mais achatada, menor ela abre. O orador ainda pode fazer pinça para ajustar.
export interface FloatFrame { text: string; color: string; bg: string; blink?: boolean }
export type FloatSize = "small" | "medium" | "large";
export const FLOAT_SIZES: FloatSize[] = ["small", "medium", "large"];
const SIZE_KEY = "visitasc.mini.size";

/** Pequena = faixa fina 2,39:1 (o mais largo que o Android aceita); média 2:1; grande 16:9. */
export function floatDims(size: FloatSize): { w: number; h: number } {
  if (size === "large") return { w: 384, h: 216 };
  if (size === "medium") return { w: 360, h: 180 };
  return { w: 360, h: 150 };
}
export function loadFloatSize(): FloatSize {
  try { const v = localStorage.getItem(SIZE_KEY); return v === "medium" || v === "large" ? v : "small"; } catch { return "small"; }
}
export function saveFloatSize(s: FloatSize) { try { localStorage.setItem(SIZE_KEY, s); } catch { /* */ } }

export function floatSupported(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as Document & { pictureInPictureEnabled?: boolean };
  return !!d.pictureInPictureEnabled && typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export interface FloatClock { open(): Promise<boolean>; close(): void; isOpen(): boolean; destroy(): void }

/** Prepara o vídeo antes do toque (o navegador exige que o pedido de flutuar venha do toque). */
export function createFloatClock(frame: () => FloatFrame, size: FloatSize = "small"): FloatClock | null {
  if (!floatSupported()) return null;
  const { w: W, h: H } = floatDims(size);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.setAttribute("playsinline", ""); video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, { position: "fixed", width: "1px", height: "1px", opacity: "0", pointerEvents: "none", left: "0", bottom: "0" });
  document.body.appendChild(video);
  const font = (px: number) => `700 ${px}px ui-monospace, Menlo, monospace`;
  const draw = () => {
    const f = frame();
    ctx.fillStyle = f.bg; ctx.fillRect(0, 0, W, H);
    if (f.blink && Math.floor(Date.now() / 500) % 2 === 1) return;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let px = Math.floor(H * 0.86);
    ctx.font = font(px);
    while (px > 20 && ctx.measureText(f.text).width > W * 0.94) { px -= 2; ctx.font = font(px); }
    ctx.fillStyle = f.color; ctx.fillText(f.text, W / 2, H / 2 + px * 0.04);
  };
  draw();
  video.srcObject = canvas.captureStream(4);
  void video.play().catch(() => { /* toca no toque */ });
  const timer = setInterval(draw, 250);
  return {
    async open() {
      try { await video.play(); await (video as HTMLVideoElement & { requestPictureInPicture: () => Promise<unknown> }).requestPictureInPicture(); return true; } catch { return false; }
    },
    close() { if (document.pictureInPictureElement === video) void document.exitPictureInPicture().catch(() => { /* */ }); },
    isOpen: () => document.pictureInPictureElement === video,
    destroy() { clearInterval(timer); this.close(); video.remove(); },
  };
}
