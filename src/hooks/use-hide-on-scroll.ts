import { useEffect, useState } from "react";

/** true quando a página está descendo (esconde o topo); volta ao subir ou perto do topo. */
export function useHideOnScroll(threshold = 8): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < 48) setHidden(false);
        else if (y - last > threshold) setHidden(true);
        else if (last - y > threshold) setHidden(false);
        if (Math.abs(y - last) > threshold) last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [threshold]);
  return hidden;
}
