// Cache local (localStorage) para snapshots retornados por server functions
// que NÃO usam React Query. Permite que telas como "Resumo da Semana" e o
// painel do visitante (corpo de anciãos / ESC) continuem exibindo o conteúdo
// quando o usuário estiver offline ou o servidor falhar.
//
// Refinamento premium: snapshots grandes (>50KB serializados) são comprimidos
// com LZ-string `compressToUTF16` — que produz strings UTF-16 armazenáveis
// diretamente em localStorage sem overhead de base64. A compressão roda em
// `queueMicrotask` para não bloquear a thread principal durante digitação
// no editor (Android WebView é sensível a long tasks).
//
// Formato do payload salvo:
//   { at: number, data: T }                       ← legado (v1, não comprimido)
//   { v: 2, at: number, c: 1, data: string }     ← v2 comprimido (data = UTF-16)
//   { v: 2, at: number, c: 0, data: T }          ← v2 texto puro (abaixo do limiar)
//
// Retrocompatível: leituras aceitam ambos os formatos.

import { compressToUTF16, decompressFromUTF16 } from "lz-string";

const PREFIX = "visita-sc:snap:";
const COMPRESS_THRESHOLD_BYTES = 50 * 1024; // 50 KB

function key(scope: string, id: string) {
  return `${PREFIX}${scope}:${id}`;
}

type LegacyEnvelope<T> = { at: number; data: T };
type V2Envelope<T> = { v: 2; at: number; c: 0 | 1; data: T | string };

function isV2<T>(x: unknown): x is V2Envelope<T> {
  return (
    !!x &&
    typeof x === "object" &&
    (x as { v?: number }).v === 2 &&
    typeof (x as { at?: unknown }).at === "number"
  );
}

function schedule(cb: () => void) {
  if (typeof window === "undefined") { cb(); return; }
  // Usa requestIdleCallback quando disponível; fallback para queueMicrotask.
  const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb);
  } else {
    queueMicrotask(cb);
  }
}

function writeEnvelope(k: string, env: V2Envelope<unknown>) {
  try {
    localStorage.setItem(k, JSON.stringify(env));
  } catch (err) {
    // Quota — tenta liberar snapshots antigos e reescrever uma vez.
    if (isQuotaError(err)) {
      purgeOldestSnapshots(3);
      try { localStorage.setItem(k, JSON.stringify(env)); } catch { /* desiste */ }
    }
  }
}

function isQuotaError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function purgeOldestSnapshots(n: number) {
  if (typeof window === "undefined") return;
  try {
    const entries: Array<{ k: string; at: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(k) ?? "null") as { at?: number };
        entries.push({ k, at: parsed?.at ?? 0 });
      } catch {
        entries.push({ k, at: 0 });
      }
    }
    entries.sort((a, b) => a.at - b.at);
    for (const e of entries.slice(0, n)) {
      try { localStorage.removeItem(e.k); } catch { /* noop */ }
    }
  } catch {
    /* noop */
  }
}

export function saveSnapshot<T>(scope: string, id: string, data: T): void {
  if (typeof window === "undefined") return;
  const at = Date.now();
  const k = key(scope, id);

  // Serialização barata para medir tamanho — feita imediatamente para não
  // perder o snapshot caso o usuário navegue antes do microtask.
  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return;
  }

  if (serialized.length < COMPRESS_THRESHOLD_BYTES) {
    // Pequeno: texto puro, sem custo de CPU.
    writeEnvelope(k, { v: 2, at, c: 0, data });
    return;
  }

  // Grande: adia a compressão para o próximo idle/microtask.
  schedule(() => {
    try {
      const compressed = compressToUTF16(serialized);
      writeEnvelope(k, { v: 2, at, c: 1, data: compressed });
    } catch {
      // Fallback: grava texto puro sem comprimir.
      writeEnvelope(k, { v: 2, at, c: 0, data });
    }
  });
}

export function loadSnapshot<T>(scope: string, id: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyEnvelope<T> | V2Envelope<T>;
    if (isV2<T>(parsed)) {
      if (parsed.c === 1 && typeof parsed.data === "string") {
        const json = decompressFromUTF16(parsed.data);
        if (!json) return null;
        return JSON.parse(json) as T;
      }
      return (parsed.data as T) ?? null;
    }
    // Legado v1.
    return (parsed as LegacyEnvelope<T>)?.data ?? null;
  } catch {
    return null;
  }
}

export function snapshotSavedAt(scope: string, id: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number };
    return parsed?.at ?? null;
  } catch {
    return null;
  }
}
