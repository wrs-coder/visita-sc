import { useEffect } from "react";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h.includes("lovable.dev")
  );
}

/**
 * Aplicativo instalado (Capacitor): a casca já está no aparelho, então o
 * service worker não deve entrar em cena. Ele guardava o index.html de uma
 * versão anterior e, após atualizar o APK, servia HTML apontando para chunks
 * que não existem mais no pacote → tela branca com
 * "Failed to fetch dynamically imported module".
 */
function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  const { hostname, protocol } = window.location;
  return (hostname === "localhost" || hostname === "127.0.0.1") && protocol === "https:";
}

async function purgeShellCaches() {
  try {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => /^(html|static)-/.test(k)).map((k) => caches.delete(k)),
    );
  } catch {
    /* noop */
  }
}

/**
 * Registers the PWA service worker on the published site only.
 * In iframe/preview/dev/native contexts, actively unregisters any prior worker
 * to avoid stale-cache issues.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const native = isNativeShell();
    const unsafe = native || isInIframe() || isPreviewHost() || import.meta.env.DEV;

    if (unsafe) {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => Promise.all(rs.map((r) => r.unregister().catch(() => undefined))))
        .then(() => (native ? purgeShellCaches() : undefined))
        .catch(() => undefined);
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}
