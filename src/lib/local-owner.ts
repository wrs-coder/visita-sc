// Isolamento de dados locais por usuário.
//
// Problema: todo o cache offline-first (React Query persistido em IndexedDB,
// snapshots em localStorage, fila offline, preferências de escopo como
// congregação ativa) era global ao dispositivo. Ao entrar com OUTRA conta no
// mesmo aparelho, dados da conta anterior continuavam visíveis — e podiam ser
// reenviados para a nuvem da conta nova.
//
// Solução: um "carimbo de dono" (userId) guardado em localStorage. Quando o
// usuário logado difere do dono anterior, todo o cache derivado da nuvem é
// apagado ANTES de qualquer leitura/escrita. Preferências puramente locais e
// neutras (tema, idioma, tamanho do cronômetro) são preservadas.

import { clearLocalNotesAndFolders } from "@/lib/bible-notes-store";

const OWNER_KEY = "visita-sc:data-owner";

/** Prefixos de chaves de localStorage que carregam dados vindos da nuvem. */
const CLOUD_KEY_PREFIXES = [
  "visita-sc:snap:", // snapshots de server functions
  "visita-sc:auth-profile:", // perfil/role/congregação em cache
  "meetings-draft:", // rascunhos de reuniões por escopo
];

/** Chaves exatas de localStorage a apagar na troca de conta. */
const CLOUD_KEYS = [
  "visita-sc:offline-queue", // mutações pendentes da conta anterior
  "visita-sc:hidden-circuit-events",
  "visita-sc:outlines-last-sync",
  "visita-sc:last-warmup",
  "visita-sc:offline-ready",
  "visita-sc:dashboard:collapsed:v1",
  "active_congregation_id",
  "notas_privadas_congregation_id",
  // Sessão de visitante (código de convite) não pertence a uma conta logada.
  "guest_invite_code",
  "guest_week_start",
  "guest_selected_congregation_id",
  "guest_week_anchor",
];

/** Chave usada pelo persister do React Query (IndexedDB + fallback). */
const RQ_IDB_KEY = "visita-sc:rq:visita-sc-rq-cache";

function purgeLocalStorage() {
  if (typeof localStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (CLOUD_KEYS.includes(k) || CLOUD_KEY_PREFIXES.some((p) => k.startsWith(p))) {
      toRemove.push(k);
    }
  }
  for (const k of toRemove) {
    try { localStorage.removeItem(k); } catch { /* noop */ }
  }
}

async function purgeQueryCache() {
  try {
    const { del } = await import("idb-keyval");
    await del(RQ_IDB_KEY);
  } catch { /* IndexedDB indisponível */ }
  try { localStorage.removeItem(RQ_IDB_KEY); } catch { /* noop */ }
}

/** Apaga TODO o cache local derivado da nuvem (usado na troca de conta). */
export async function clearCloudDerivedLocalData(): Promise<void> {
  purgeLocalStorage();
  await purgeQueryCache();
  try { await clearLocalNotesAndFolders(); } catch { /* noop */ }
}

/**
 * Garante que o armazenamento local pertence ao usuário informado.
 * Retorna `true` quando houve limpeza (troca de conta detectada).
 */
export async function ensureLocalDataOwner(userId: string | null | undefined): Promise<boolean> {
  if (typeof window === "undefined" || !userId) return false;
  let previous: string | null = null;
  try { previous = localStorage.getItem(OWNER_KEY); } catch { return false; }

  if (previous === userId) return false;

  if (previous && previous !== userId) {
    await clearCloudDerivedLocalData();
  }
  try { localStorage.setItem(OWNER_KEY, userId); } catch { /* noop */ }
  return !!previous && previous !== userId;
}
