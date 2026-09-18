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
const PROBE_VALID_FOR_MS = 30000;
export const API_REQUEST_TIMEOUT_MS = 12000;

let currentOrigin: string | null = null;
let lastSuccessfulProbeAt = 0;
let inflightResolution: Promise<string | null> | null = null;

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
export function rankApiOrigins(saved: string | null): string[] {
  const list = [...API_ORIGINS] as string[];
  if (saved && list.includes(saved)) {
    return [saved, ...list.filter((o) => o !== saved)];
  }
  return list;
}

/** Ordem de tentativa: origem memorizada primeiro, depois as demais. */
export function orderedOrigins(): string[] {
  return rankApiOrigins(safeGet(STORAGE_KEY));
}

/** Coloca a origem validada primeiro sem perder nenhuma contingência. */
export function apiOriginAttempts(preferred: string): string[] {
  return [preferred, ...API_ORIGINS.filter((origin) => origin !== preferred)];
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
  lastSuccessfulProbeAt = Date.now();
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

/** Verdadeiro quando a resposta veio de outro domínio (redirecionamento). */
export function isCrossHostRedirect(origin: string, responseUrl: string): boolean {
  if (!responseUrl) return false;
  try {
    return new URL(responseUrl).host !== new URL(origin).host;
  } catch {
    return false;
  }
}

/**
 * Confirma que a origem responde diretamente ao endpoint de saúde.
 *
 * Não usamos `redirect: "manual"`: esse modo falha em várias versões do
 * navegador interno do Android (WebView), derrubando o teste mesmo com
 * internet perfeita. Em vez disso seguimos o redirecionamento normalmente e
 * comparamos o endereço final da resposta — se mudou de domínio, a origem é
 * descartada, porque o redirecionamento não carrega a autorização CORS.
 */
async function probe(origin: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    if (isNativeApp()) {
      const { nativeHttpRequest } = await import("./native-http");
      const { response, finalUrl } = await nativeHttpRequest(origin + PROBE_PATH, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 204 || response.ok) return new URL(finalUrl).origin;
      throw new Error(`Servidor indisponível em ${origin} (${response.status})`);
    }

    const response = await fetch(origin + PROBE_PATH, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (isCrossHostRedirect(origin, response.url)) throw new Error(`${origin} redireciona para outro domínio`);
    if (response.status === 204 || response.ok) return origin;
    throw new Error(`Servidor indisponível em ${origin} (${response.status})`);
  } finally {
    clearTimeout(timer);
  }
}

export type OriginProbeResult = { origin: string; ok: boolean; detail: string };

/** Testa todas as origens e devolve o resultado de cada uma (diagnóstico). */
export async function probeAllOrigins(): Promise<OriginProbeResult[]> {
  return Promise.all(
    orderedOrigins().map(async (origin) => {
      try {
        await probe(origin);
        return { origin, ok: true, detail: "respondeu" };
      } catch (error) {
        const detail =
          error instanceof DOMException && error.name === "AbortError"
            ? "sem resposta (tempo esgotado)"
            : error instanceof Error
              ? error.message
              : "falha de rede";
        return { origin, ok: false, detail };
      }
    }),
  );
}

/**
 * Testa todas as origens em paralelo e memoriza a primeira que responder
 * (a preferida ganha um pequeno adiantamento). Retorna null se nenhuma
 * responder (offline) — o app continua funcionando com o cache local.
 */
export async function resolveBestApiOrigin(): Promise<string | null> {
  if (!isNativeApp()) return null;
  if (currentOrigin && Date.now() - lastSuccessfulProbeAt < PROBE_VALID_FOR_MS) {
    return currentOrigin;
  }
  if (inflightResolution) return inflightResolution;

  const list = orderedOrigins();
  inflightResolution = (async () => {
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
      currentOrigin = null;
      lastSuccessfulProbeAt = 0;
      return null;
    } finally {
      inflightResolution = null;
    }
  })();

  return inflightResolution;
}

/** Força uma nova verificação após uma falha real de transporte. */
export function invalidateApiOrigin() {
  currentOrigin = null;
  lastSuccessfulProbeAt = 0;
}
