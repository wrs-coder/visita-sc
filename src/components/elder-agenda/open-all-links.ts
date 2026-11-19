// "Clique aqui": abre todos os links de uma linha. No navegador, uma aba por link;
// no app, um depois do outro no navegador do sistema (o próximo abre quando o anterior é fechado).
export async function openAllLinks(urls: string[]): Promise<void> {
  const list = urls.filter(Boolean);
  if (!list.length) return;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) { alert("Precisa de internet para abrir este link."); return; }
    const { Browser } = await import("@capacitor/browser");
    for (const url of list) {
      const closed = new Promise<void>((resolve) => {
        void Browser.addListener("browserFinished", () => resolve()).then((h) => closed.finally(() => void h.remove()));
      });
      await Browser.open({ url });
      if (url !== list[list.length - 1]) await closed;
    }
    return;
  }
  for (const url of list) window.open(url, "_blank", "noopener,noreferrer");
}
