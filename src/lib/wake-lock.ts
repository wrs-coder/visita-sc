/**
 * Screen Wake Lock wrapper (Onda 7.12 / Missão 06).
 *
 * Mantém a tela do dispositivo ligada enquanto pelo menos um consumidor
 * tiver o lock adquirido. Usado pelo cronômetro de esboço para evitar que
 * o aparelho hiberne durante o discurso.
 *
 * Funciona no WebView do Capacitor (Web Wake Lock API) — não exige plugin
 * nativo novo. Falhas silenciosas: se o ambiente não suportar, o timer
 * continua funcionando normalmente.
 */

type WakeLockSentinelLike = {
  release(): Promise<void>;
  released: boolean;
  addEventListener(type: "release", listener: () => void): void;
};

type WakeLockApi = {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
};

function getApi(): WakeLockApi | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as unknown as { wakeLock?: WakeLockApi };
  return nav.wakeLock ?? null;
}

let refCount = 0;
let sentinel: WakeLockSentinelLike | null = null;
let visibilityHookInstalled = false;

async function ensureSentinel(): Promise<void> {
  const api = getApi();
  if (!api) return;
  if (sentinel && !sentinel.released) return;
  try {
    sentinel = await api.request("screen");
    sentinel.addEventListener("release", () => {
      // Browser libera ao esconder a aba; mantemos o ref para reatacar.
    });
  } catch {
    sentinel = null;
  }
}

function installVisibilityHook(): void {
  if (visibilityHookInstalled) return;
  if (typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && refCount > 0) {
      void ensureSentinel();
    }
  });
}

export async function acquireScreenWakeLock(): Promise<void> {
  refCount += 1;
  installVisibilityHook();
  await ensureSentinel();
}

export async function releaseScreenWakeLock(): Promise<void> {
  if (refCount > 0) refCount -= 1;
  if (refCount > 0) return;
  const current = sentinel;
  sentinel = null;
  if (current && !current.released) {
    try {
      await current.release();
    } catch {
      /* noop */
    }
  }
}

export function isWakeLockSupported(): boolean {
  return getApi() !== null;
}
