// Origem dinâmica das chamadas de dados (server functions do TanStack Start).
//
// - No navegador (site): sempre a própria origem da página.
// - No aplicativo nativo (Capacitor, casca local): o primeiro dos domínios
//   publicados que responder, com preferência pelo último que funcionou.
//
// Nenhum redirecionamento de página é feito: o app continua rodando local e
// apenas as requisições de dados apontam para o domínio escolhido. Assim o
// usuário nunca é deslogado quando a origem muda.

export const API_ORIGINS = [
  "https://visitasc.com.br",
  "https://www.visitasc.com.br",
  "https://visita-sc.lovable.app",
] as const;

const STORAGE_KEY = "visitasc.api-origin";
// Endpoint próprio do servidor (autoriza a chamada vinda do app). Arquivos
// estáticos como o manifest são servidos pela hospedagem sem essa autorização,
// então nunca servem como teste de conexão.
const PROBE_PATH = "/api/public/ping";
const PROBE_TIMEOUT_MS = 8000;

let currentOrigin: string | null = null;

function safeGet(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage?.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** true apenas dentro do APK/AAB (WebView do Capacitor). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return cap?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** Ordem de tentativa: origem memorizada primeiro, depois as demais. */
export function orderedOrigins(): string[] {
  const saved = safeGet(STORAGE_KEY);
  const list = [...API_ORIGINS] as string[];
  if (saved && list.includes(saved)) {
    return [saved, ...list.filter((o) => o !== saved)];
  }
  return list;
}

/** Origem usada agora para chamadas de dados. */
export function getApiOrigin(): string {
  if (!isNativeApp()) {
    return typeof window === "undefined" ? "" : window.location.origin;
  }
  if (!currentOrigin) currentOrigin = orderedOrigins()[0];
  return currentOrigin;
}

export function setApiOrigin(origin: string) {
  currentOrigin = origin;
  safeSet(STORAGE_KEY, origin);
}

/** Próxima origem da lista (usada quando a atual falha por rede). */
export function nextApiOrigin(): string {
  const list = orderedOrigins();
  const idx = Math.max(0, list.indexOf(getApiOrigin()));
  const next = list[(idx + 1) % list.length];
  setApiOrigin(next);
  return next;
}

/** Converte uma URL relativa de server function em absoluta quando nativo. */
export function resolveApiUrl(input: string, origin = getApiOrigin()): string {
  if (!origin) return input;
  if (/^https?:\/\//i.test(input)) return input;
  return origin + (input.startsWith("/") ? input : `/${input}`);
}

/**
 * Qualquer resposta HTTP conta como "servidor acessível" — inclusive erros.
 * Só falha de rede/timeout significa offline.
 */
async function probe(origin: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(origin + PROBE_PATH, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return origin;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Testa todas as origens em paralelo e memoriza a primeira que responder
 * (a preferida ganha um pequeno adiantamento). Retorna null se nenhuma
 * responder (offline) — o app continua funcionando com o cache local.
 */
export async function resolveBestApiOrigin(): Promise<string | null> {
  if (!isNativeApp()) return null;
  const list = orderedOrigins();
  const attempts = list.map((origin, index) =>
    index === 0
      ? probe(origin)
      : new Promise<string>((resolve, reject) => {
          setTimeout(() => probe(origin).then(resolve, reject), index * 250);
        }),
  );
  try {
    const winner = await Promise.any(attempts);
    setApiOrigin(winner);
    return winner;
  } catch {
    return null;
  }
}
