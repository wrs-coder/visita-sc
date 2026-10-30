// Cabeçalho que encolhe ao rolar para baixo e volta ao rolar para cima
// (título grande do iOS / área de leitura da One UI). Só presentação.
import { useEffect, useState } from "react";

export function shouldHide(prevY: number, y: number, hidden: boolean): boolean {
  if (y < 64) return false; // perto do topo: sempre visível
  const d = y - prevY;
  if (d > 8) return true; // rolando para baixo
  if (d < -8) return false; // rolando para cima
  return hidden;
}

export function useHideOnScroll(paused = false): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (paused) { setHidden(false); return; }
    let prev = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setHidden((h) => {
          const next = shouldHide(prev, y, h);
          if (Math.abs(y - prev) > 8) prev = y;
          return next;
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [paused]);
  return hidden;
}
