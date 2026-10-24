/**
 * Botão voltar do Android (app instalado): fecha camada aberta, senão volta
 * no histórico, senão pede duplo toque para sair.
 */
export type BackAction = "close-layer" | "history-back" | "confirm-exit" | "exit";

export function decideBackAction(opts: {
  hasOpenLayer: boolean;
  canGoBack: boolean;
  isRoot: boolean;
  lastExitPressAt: number | null;
  now: number;
}): BackAction {
  if (opts.hasOpenLayer) return "close-layer";
  if (opts.canGoBack && !opts.isRoot) return "history-back";
  if (opts.lastExitPressAt && opts.now - opts.lastExitPressAt < 2000) return "exit";
  return "confirm-exit";
}

const LAYER_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [data-radix-popper-content-wrapper], [data-back-closable]';

const ROOT_PATHS = new Set(["/", "/dashboard", "/visitante", "/visitante/painel"]);

let installed = false;

export async function installNativeBackButton(onConfirmExit: () => void): Promise<void> {
  if (installed || typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    installed = true;
    let lastExitPressAt: number | null = null;
    await App.addListener("backButton", ({ canGoBack }) => {
      const action = decideBackAction({
        hasOpenLayer: !!document.querySelector(LAYER_SELECTOR),
        canGoBack: canGoBack || window.history.length > 1,
        isRoot: ROOT_PATHS.has(window.location.pathname.replace(/\/$/, "") || "/"),
        lastExitPressAt,
        now: Date.now(),
      });
      if (action === "close-layer") {
        const target = (document.activeElement as HTMLElement | null) ?? document.body;
        const ev = { key: "Escape", code: "Escape", keyCode: 27, bubbles: true, cancelable: true };
        target.dispatchEvent(new KeyboardEvent("keydown", ev));
        document.dispatchEvent(new KeyboardEvent("keydown", ev));
      } else if (action === "history-back") {
        window.history.back();
      } else if (action === "exit") {
        void App.exitApp();
      } else {
        lastExitPressAt = Date.now();
        onConfirmExit();
      }
    });
  } catch {
    /* web: sem botão nativo */
  }
}
