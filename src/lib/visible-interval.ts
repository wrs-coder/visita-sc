/**
 * Intervalo que economiza bateria: não executa enquanto o app está em
 * segundo plano (aba oculta / tela desligada) e roda uma vez assim que
 * volta a ficar visível. Retorna a função de limpeza.
 */
export function setVisibleInterval(fn: () => void, ms: number): () => void {
  if (typeof window === "undefined") return () => {};
  const id = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    fn();
  }, ms);
  const onVisible = () => {
    if (document.visibilityState === "visible") fn();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
