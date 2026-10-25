import { useEffect, useState } from "react";

/**
 * Altura da tela medida com o teclado virtual FECHADO.
 *
 * No Android (adjustResize) a janela encolhe quando o teclado abre, e alturas
 * baseadas em `dvh`/`vh` despencam (a área de texto ficava com ~3 linhas).
 * Aqui guardamos a maior altura vista para a largura atual e só a trocamos
 * quando a largura muda (rotação) — abrir o teclado não altera o valor.
 * Retorna null até medir (SSR/primeira pintura usam o valor CSS de reserva).
 */
export function useStableViewportHeight(threshold = 150): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let width = window.innerWidth;
    let stable = window.innerHeight;
    setHeight(stable);

    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w !== width) {
        // Rotação/redimensionamento real: recomeça a medição.
        width = w;
        stable = h;
        setHeight(h);
        return;
      }
      // Teclado aberto (queda grande): mantém a altura anterior.
      if (stable - h > threshold) return;
      if (h !== stable) {
        stable = h;
        setHeight(h);
      }
    };

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [threshold]);

  return height;
}
