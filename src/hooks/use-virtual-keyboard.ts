import { useEffect, useState } from "react";

/**
 * Detecta se o teclado virtual está aberto comparando a altura do
 * `visualViewport` com a altura da janela. Usado para esconder/mostrar
 * elementos flutuantes (toolbar de edição) no mobile.
 */
export function useVirtualKeyboardVisible(threshold = 150): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const diff = window.innerHeight - vv.height;
      setVisible(diff > threshold);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [threshold]);

  return visible;
}
