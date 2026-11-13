// Janelinha flutuante do Mini tempo: o relógio é desenhado num canvas e vira um "vídeo"
// que o navegador deixa por cima de outros apps (Picture-in-Picture). Só apresentação.
export interface FloatFrame { text: string; sub: string; color: string; bg: string; fg: string }

export function floatSupported(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as Document & { pictureInPictureEnabled?: boolean };
  return !!d.pictureInPictureEnabled && typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export interface FloatClock { open(): Promise<boolean>; close(): void; isOpen(): boolean; destroy(): void }

/** Prepara o vídeo antes do toque (o navegador exige que o pedido de flutuar venha do toque). */
export function createFloatClock(frame: () => FloatFrame): FloatClock | null {
  if (!floatSupported()) return null;
  const W = 480, H = 240;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.setAttribute("playsinline", ""); video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, { position: "fixed", width: "1px", height: "1px", opacity: "0", pointerEvents: "none", left: "0", bottom: "0" });
  document.body.appendChild(video);
  const draw = () => {
    const f = frame();
    ctx.fillStyle = f.bg; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let px = 150;
    ctx.font = `600 ${px}px ui-monospace, Menlo, monospace`;
    while (px > 40 && ctx.measureText(f.text).width > W * 0.92) { px -= 6; ctx.font = `600 ${px}px ui-monospace, Menlo, monospace`; }
    ctx.fillStyle = f.color; ctx.fillText(f.text, W / 2, f.sub ? H * 0.44 : H / 2);
    if (f.sub) { ctx.font = "600 30px system-ui, sans-serif"; ctx.fillStyle = f.fg; ctx.fillText(f.sub.slice(0, 32), W / 2, H * 0.84); }
  };
  draw();
  video.srcObject = canvas.captureStream(4);
  void video.play().catch(() => { /* toca no toque */ });
  const timer = setInterval(draw, 250);
  return {
    async open() {
      try { await video.play(); await (video as HTMLVideoElement & { requestPictureInPicture: () => Promise<unknown> }).requestPictureInPicture(); return true; } catch { return false; }
    },
    close() { if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => { /* */ }); },
    isOpen: () => document.pictureInPictureElement === video,
    destroy() { clearInterval(timer); this.close(); video.remove(); },
  };
}
