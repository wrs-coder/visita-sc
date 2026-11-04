// Sincronização pedida pelo usuário: o ÚNICO momento em que o app conversa
// de verdade com o servidor ("celular primeiro").
//
// 1. Envia o que foi salvo no aparelho e ainda não subiu.
// 2. Baixa TODAS as tabelas, completas, para o espelho do celular.
// 3. Atualiza a cópia das telas (funções de leitura e consultas guardadas).
// 4. Registra quando terminou e o que falhou, para a tela mostrar.

import type { QueryClient } from "@tanstack/react-query";
import { withNetworkWindow } from "@/lib/net-policy";
import { listCached, putCached } from "@/lib/response-cache";

export type DeviceSyncProgress = { step: number; total: number; label: string };

export type DeviceSyncReport = {
  at: number;
  sent: number;
  remaining: number;
  aborted: boolean;
  tablesOk: number;
  tablesFailed: string[];
  screensFailed: number;
};

const REPORT_KEY = (uid: string) => `visita-sc:device-sync:${uid}`;
export const DEVICE_SYNC_EVENT = "visita-sc:device-sync";

export function readDeviceSyncReport(uid: string | null | undefined): DeviceSyncReport | null {
  if (!uid || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REPORT_KEY(uid));
    return raw ? (JSON.parse(raw) as DeviceSyncReport) : null;
  } catch {
    return null;
  }
}

function saveReport(uid: string, r: DeviceSyncReport) {
  try {
    localStorage.setItem(REPORT_KEY(uid), JSON.stringify(r));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent(DEVICE_SYNC_EVENT));
}

async function refreshStoredTableReads(): Promise<number> {
  const { rawFetch } = await import("@/lib/connection-mode");
  const { accessTokenFast } = await import("@/lib/auth-attach-safe");
  const token = await accessTokenFast();
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const entries = (await listCached()).filter((e) => e.kind === "rest" && e.request.method === "GET");
  let failed = 0;
  for (const e of entries) {
    try {
      const headers = new Headers(e.request.headers);
      headers.set("apikey", apikey);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await Promise.race([
        rawFetch(e.request.url, { method: "GET", headers }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
      ]);
      if (!res.ok) {
        failed++;
        continue;
      }
      const body = await res.text();
      const h: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        if (!["set-cookie"].includes(k)) h[k] = v;
      });
      await putCached({ ...e, status: res.status, headers: h, body, savedAt: Date.now() });
    } catch {
      failed++;
    }
  }
  return failed;
}

export async function runDeviceSync(opts: {
  queryClient: QueryClient;
  userId: string;
  role: "superintendent" | "elder" | null;
  t?: (key: string) => string;
  onProgress?: (p: DeviceSyncProgress) => void;
}): Promise<DeviceSyncReport> {
  const total = 4;
  const step = (n: number, label: string) => opts.onProgress?.({ step: n, total, label });

  return withNetworkWindow(async () => {
    step(1, "send");
    const { flushQueue } = await import("@/lib/offline-queue");
    const flush = await flushQueue().catch(() => ({ sent: 0, remaining: 0, aborted: true }));

    step(2, "tables");
    const { runAutoSync } = await import("@/lib/local-auto-sync");
    const results = (await runAutoSync({ force: true, full: true }).catch(() => null)) ?? [];
    const tablesFailed = results.filter((r) => !r.ok).map((r) => r.table);

    step(3, "screens");
    const { prefetchAllForOffline } = await import("@/lib/offline-prefetch");
    let screensFailed = 0;
    try {
      const res = await prefetchAllForOffline({
        queryClient: opts.queryClient,
        userId: opts.userId,
        congregationId: null,
        role: opts.role,
        t: opts.t,
        force: true,
      });
      screensFailed += (res as { errors?: number })?.errors ?? 0;
    } catch {
      screensFailed++;
    }
    // Atualiza também as telas já abertas antes (inclusive as fechadas).
    try {
      await opts.queryClient.refetchQueries({ type: "all" });
    } catch {
      screensFailed++;
    }

    step(4, "copies");
    screensFailed += await refreshStoredTableReads();

    const report: DeviceSyncReport = {
      at: Date.now(),
      sent: flush.sent ?? 0,
      remaining: flush.remaining ?? 0,
      aborted: !!flush.aborted,
      tablesOk: results.filter((r) => r.ok).length,
      tablesFailed,
      screensFailed,
    };
    saveReport(opts.userId, report);
    return report;
  });
}
