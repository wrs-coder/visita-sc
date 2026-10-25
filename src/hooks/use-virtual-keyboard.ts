import { useEffect, useState } from "react";

/**
 * Detecta se o teclado virtual está aberto.
 *
 * Navegador comum: o teclado reduz só o `visualViewport` (innerHeight fica).
 * App Android (adjustResize): a janela inteira encolhe, então innerHeight
 * também cai. Por isso comparamos com a maior altura já vista para a largura
 * atual (zerada em rotação), cobrindo os dois casos.
 */
export function useVirtualKeyboardVisible(threshold = 150): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    let width = window.innerWidth;
    let fullHeight = window.innerHeight;

    const update = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        fullHeight = window.innerHeight;
      }
      fullHeight = Math.max(fullHeight, window.innerHeight);
      const current = vv ? vv.height : window.innerHeight;
      setVisible(fullHeight - current > threshold);
    };

    update();
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [threshold]);

  return visible;
}
