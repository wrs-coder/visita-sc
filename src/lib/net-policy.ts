// Política de rede "celular primeiro".
//
// - As telas leem do celular. O servidor só é consultado:
//     1. durante a sincronização pedida pelo usuário (janela de rede), ou
//     2. logo depois de uma gravação bem-sucedida (janela curta de frescor),
//        para a tela mostrar o que acabou de ser salvo, ou
//     3. quando o dado ainda não existe no celular.
// - Toda chamada ao servidor tem limite de espera: internet "pendurada"
//   nunca prende a tela.
// - "Simular internet ruim" faz as chamadas esperarem o limite e falharem,
//   para testar em casa o comportamento da zona rural.

export const READ_TIMEOUT_MS = 8000;
export const WRITE_TIMEOUT_MS = 12000;
export const AUTH_TIMEOUT_MS = 10000;
/** Depois de salvar algo, as leituras vão ao servidor por este tempo. */
export const FRESH_AFTER_WRITE_MS = 90_000;

const SIMULATE_KEY = "visita-sc:simulate-bad-net";

let syncDepth = 0;
let freshUntil = 0;

/** Liga a janela de rede (sincronização pedida pelo usuário). */
export async function withNetworkWindow<T>(op: () => Promise<T>): Promise<T> {
  syncDepth++;
  try {
    return await op();
  } finally {
    syncDepth = Math.max(0, syncDepth - 1);
  }
}

export function isNetworkWindowOpen(): boolean {
  return syncDepth > 0;
}

/** Marca que uma gravação acabou de dar certo no servidor. */
export function markWriteSucceeded(now = Date.now()): void {
  freshUntil = now + FRESH_AFTER_WRITE_MS;
}

/** Leituras devem preferir o servidor agora? */
export function preferNetworkNow(now = Date.now()): boolean {
  return syncDepth > 0 || now < freshUntil;
}

export function isSimulatingBadNetwork(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIMULATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSimulateBadNetwork(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(SIMULATE_KEY, "1");
    else localStorage.removeItem(SIMULATE_KEY);
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("visita-sc:simulate-bad-net"));
}

/** Erro com cara de falha de rede (os fallbacks existentes reconhecem). */
export function networkTimeoutError(): TypeError {
  return new TypeError("Failed to fetch (timeout)");
}

/**
 * Executa uma chamada de rede com limite de espera. Se o usuário estiver
 * simulando internet ruim, espera o limite e falha, como na zona rural.
 */
export async function fetchWithTimeout(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  timeoutMs: number,
  callerSignal?: AbortSignal | null,
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", onAbort, { once: true });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(networkTimeoutError());
    }, timeoutMs);
  });
  try {
    if (isSimulatingBadNetwork()) return await timeout;
    return await Promise.race([doFetch(controller.signal), timeout]);
  } catch (err) {
    if (callerSignal?.aborted) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw networkTimeoutError();
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onAbort);
  }
}
