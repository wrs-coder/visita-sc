/**
 * Screen Wake Lock wrapper (Onda 7.12 / Missão 06).
 *
 * Mantém a tela do dispositivo ligada enquanto pelo menos um consumidor
 * tiver o lock adquirido. Usado pelo cronômetro de esboço e pelo flush
 * grande da fila offline para evitar que o WebView hiberne no meio.
 *
 * Refinamento premium (offline-first): timeout rígido máximo de 20s por
 * aquisição temporária (`acquireScreenWakeLockTimed`), como salvaguarda de
 * bateria em redes instáveis. Se o consumidor liberar antes, o timer é
 * cancelado. Se o timer expirar, o lock é liberado automaticamente sem
 * re-aquisição — se ainda for necessário, o consumidor deve chamar de novo
 * (evita loop indefinido drenando bateria).
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
    // Ao esconder: Android já revoga; garantimos idempotência liberando o ref.
    if (document.visibilityState === "hidden" && sentinel && !sentinel.released) {
      sentinel.release().catch(() => {
        /* noop */
      });
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

/**
 * Adquire um wake lock com timeout rígido. Retorna uma função `release()`
 * idempotente que também cancela o timer. Se o timer expirar antes do
 * consumidor chamar release, o lock é liberado automaticamente.
 *
 * Uso típico: flushes grandes da fila offline (mais de 5 itens) — 20s é
 * mais que suficiente para o batch típico e evita drenar bateria caso o
 * flush trave em rede instável.
 */
export async function acquireScreenWakeLockTimed(maxMs = 20_000): Promise<() => void> {
  await acquireScreenWakeLock();
  let released = false;
  const timer = setTimeout(() => {
    if (released) return;
    released = true;
    void releaseScreenWakeLock();
    console.warn(`[wake-lock] timeout de ${maxMs}ms — liberação automática de segurança`);
  }, maxMs);

  return () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    void releaseScreenWakeLock();
  };
}

export function isWakeLockSupported(): boolean {
  return getApi() !== null;
}
