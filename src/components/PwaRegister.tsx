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
 * Registers the PWA service worker on the published site only.
 * In iframe/preview/dev contexts, actively unregisters any prior worker
 * to avoid stale-cache issues inside the Lovable editor.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const unsafe = isInIframe() || isPreviewHost() || import.meta.env.DEV;

    if (unsafe) {
      navigator.serviceWorker.getRegistrations().then((rs) => {
        rs.forEach((r) => r.unregister().catch(() => undefined));
      });
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
