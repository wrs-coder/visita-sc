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

/**
 * Quanto o teclado cobre o fundo da janela e a altura visível agora.
 *
 * App Android (adjustResize): a janela já encolhe, então `inset` fica 0 e
 * `position: fixed; bottom: 0` cai logo acima do teclado. Navegador/iOS: a
 * janela não encolhe, então `inset` = altura escondida pelo teclado.
 */
export function useVisualViewportInset(): { inset: number; height: number } {
  const [state, setState] = useState({ inset: 0, height: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const height = vv ? vv.height : window.innerHeight;
        const inset = vv ? Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop))) : 0;
        setState((s) => (s.inset === inset && s.height === Math.round(height) ? s : { inset, height: Math.round(height) }));
      });
    };
    update();
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
