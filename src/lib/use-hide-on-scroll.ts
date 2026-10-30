// Cabeçalho que encolhe ao rolar para baixo e volta ao rolar para cima
// (título grande do iOS / área de leitura da One UI). Só apresentação.
// Como html/body têm overflow-x:hidden, o body vira o contêiner de rolagem
// e window.scrollY fica 0; por isso lemos a maior posição entre os três.
import { useEffect, useState } from "react";

export function shouldHide(prevY: number, y: number, hidden: boolean): boolean {
  if (y < 64) return false; // perto do topo: sempre visível
  const d = y - prevY;
  if (d > 8) return true; // rolando para baixo
  if (d < -8) return false; // rolando para cima
  return hidden;
}

type ScrollSources = { windowY: number; htmlTop: number; bodyTop: number };
export function pageScrollY(s: ScrollSources): number {
  return Math.max(s.windowY || 0, s.htmlTop || 0, s.bodyTop || 0);
}

function readPageY(): number {
  return pageScrollY({
    windowY: window.scrollY,
    htmlTop: document.documentElement.scrollTop,
    bodyTop: document.body?.scrollTop ?? 0,
  });
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function useHideOnScroll(paused = false, resetKey?: unknown): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    if (paused) return;
    let prev = readPageY();
    let raf = 0;
    const onScroll = (e: Event) => {
      const t = e.target;
      // Só a rolagem da página conta (ignora carrossel, menus e listas internas).
      if (t !== document && t !== document.documentElement && t !== document.body) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = readPageY();
        if (isTyping()) { prev = y; setHidden(false); return; }
        setHidden((h) => {
          const next = shouldHide(prev, y, h);
          if (Math.abs(y - prev) > 8) prev = y;
          return next;
        });
      });
    };
    const onFocus = () => { if (isTyping()) setHidden(false); };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener("focusin", onFocus);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [paused, resetKey]);
  return hidden;
}
