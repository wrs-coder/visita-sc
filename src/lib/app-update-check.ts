// Verificação de nova versão do aplicativo instalado (APK/AAB).
//
// O app não consulta a Play Store diretamente (exigiria conta de serviço do
// Google). Em vez disso compara a própria versão com a publicada no endpoint
// /api/public/version do domínio ativo. Roda apenas no app instalado, com
// rede, no máximo uma vez a cada 6 horas.

import { isNativeApp, resolveApiUrl } from "@/lib/api-origin";

// Versão desta casca — manter igual a package.json / build.gradle / LoginForm.
export const APP_VERSION = "4.2.16";

const LAST_CHECK_KEY = "visita-sc:last-update-check";
const DISMISS_KEY = "visita-sc:update-dismissed";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min — "Agora não" cobre o resto do dia
const FETCH_TIMEOUT_MS = 8000;

export type UpdateCheckResult = {
  latest: string;
  minSupported: string;
  current: string;
  /** true quando existe versão mais nova disponível. */
  updateAvailable: boolean;
  /** true quando a versão instalada ficou abaixo do mínimo suportado. */
  belowMinimum: boolean;
};

/** Compara versões semânticas: >0 se a>b, <0 se a<b, 0 se iguais. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

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

/** "Agora não" vale até o fim do dia — o aviso mole reaparece no dia seguinte. */
export function dismissUpdateForToday(version: string): void {
  safeSet(DISMISS_KEY, `${new Date().toDateString()}:${version}`);
}

export function isUpdateDismissedToday(version: string): boolean {
  return safeGet(DISMISS_KEY) === `${new Date().toDateString()}:${version}`;
}

/** Versão real instalada (Android), com o número fixo como reserva. */
export async function getInstalledVersion(): Promise<string> {
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    if (info?.version && /^\d+(\.\d+)*$/.test(info.version)) return info.version;
  } catch {
    /* fallback */
  }
  return APP_VERSION;
}

/**
 * Consulta o endpoint de versão. Retorna null quando não é app instalado,
 * está offline, a última checagem foi recente ou a rede falhou — nunca lança.
 */
export async function checkForAppUpdate(opts?: { force?: boolean }): Promise<UpdateCheckResult | null> {
  if (!isNativeApp()) return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;

  if (!opts?.force) {
    const last = Number(safeGet(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - last < CHECK_INTERVAL_MS) return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = resolveApiUrl("/api/public/version");
    type VersionPayload = { latest?: string; minSupported?: string };
    let payload: VersionPayload | null = null;

    if (isNativeApp()) {
      const { nativeHttpRequest } = await import("@/lib/native-http");
      const { response } = await nativeHttpRequest(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      payload = (await response.json()) as VersionPayload;
    } else {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return null;
      payload = (await response.json()) as VersionPayload;
    }

    const latest = typeof payload?.latest === "string" ? payload.latest : null;
    const minSupported =
      typeof payload?.minSupported === "string" ? payload.minSupported : "0.0.0";
    if (!latest) return null;

    safeSet(LAST_CHECK_KEY, String(Date.now()));
    const current = await getInstalledVersion();

    return {
      latest,
      minSupported,
      current,
      updateAvailable: compareVersions(latest, current) > 0,
      belowMinimum: compareVersions(current, minSupported) < 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Abre a página do app na Play Store (market:// com fallback https). */
export function openPlayStore(): void {
  const id = "com.waorodrigues.visitasc";
  const market = `market://details?id=${id}`;
  const web = `https://play.google.com/store/apps/details?id=${id}`;
  try {
    window.location.href = market;
    // Se o market:// não abrir (sem Play Store), cai no link web.
    setTimeout(() => {
      try {
        window.open(web, "_blank", "noopener");
      } catch {
        /* noop */
      }
    }, 1200);
  } catch {
    window.open(web, "_blank", "noopener");
  }
}
