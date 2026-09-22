// FASE 3 — Escritas offline refletidas no espelho local + conflito resolvido.
//
// Estratégia de RISCO ZERO:
// - O caminho de envio continua sendo exatamente o atual (`offline-supabase`
//   + `offline-queue`): nada muda para quem está online.
// - A única adição é: toda escrita também é aplicada no espelho local
//   (`local-db`), marcada como `dirty` (pendente). Assim, se a tela recarregar
//   offline, o usuário vê a alteração que acabou de fazer.
// - Conflito: `upsertRows` já garante que uma linha `dirty` só é sobrescrita
//   pelo servidor com carimbo `updated_at` ESTRITAMENTE maior (o servidor
//   vence quando realmente tem versão mais nova; caso contrário a edição
//   local pendente é preservada).
// - Quando a fila esvazia (tudo confirmado pelo servidor), os marcadores
//   `dirty` são limpos.
//
// Nenhuma falha do espelho local pode derrubar a tela: tudo é engolido com
// aviso no console.

import {
  clearDirty,
  getRow,
  getRows,
  markDeleted,
  upsertRows,
} from "@/lib/local-db";
import {
  offlineDelete,
  offlineInsert,
  offlineUpdate,
  offlineUpsert,
  type OfflineResult,
  type OfflineInsertOpts,
} from "@/lib/offline-supabase";
import { queueSize, subscribe } from "@/lib/offline-queue";

type Row = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function safe(p: Promise<unknown>, what: string) {
  void p.catch((err) => console.warn("[local-write] falha no espelho local", what, err));
}

/** Guarda a tabela tocada para poder limpar `dirty` quando a fila esvaziar. */
const touchedTables = new Set<string>();

async function mirrorRow(table: string, row: Row) {
  touchedTables.add(table);
  await upsertRows(table, [{ ...row, updated_at: nowIso() }], { dirty: true });
}

/** Aplica um patch sobre a linha já espelhada (ou cria uma linha mínima). */
async function mirrorPatch(table: string, id: string, patch: Row) {
  const current = (await getRow<Row>(table, id)) ?? { id };
  await mirrorRow(table, { ...current, ...patch, id });
}

export async function localInsert(
  table: string,
  payload: Row,
  opts: OfflineInsertOpts = {},
): Promise<OfflineResult> {
  const res = await offlineInsert(table, payload, opts);
  if (!res.error && typeof payload.id === "string") {
    safe(mirrorRow(table, payload), `${table}.insert`);
  }
  return res;
}

export async function localUpsert(table: string, payload: Row): Promise<OfflineResult> {
  const res = await offlineUpsert(table, payload);
  if (!res.error && typeof payload.id === "string") {
    safe(mirrorRow(table, payload), `${table}.upsert`);
  }
  return res;
}

export async function localUpdate(
  table: string,
  patch: Row,
  match: Record<string, unknown>,
): Promise<OfflineResult> {
  const res = await offlineUpdate(table, patch, match);
  const id = match.id;
  if (!res.error && typeof id === "string") {
    safe(mirrorPatch(table, id, patch), `${table}.update`);
  }
  return res;
}

export async function localDelete(
  table: string,
  match: Record<string, unknown>,
): Promise<OfflineResult> {
  const res = await offlineDelete(table, match);
  const id = match.id;
  if (!res.error && typeof id === "string") {
    touchedTables.add(table);
    safe(markDeleted(table, [id]), `${table}.delete`);
  }
  return res;
}

/**
 * Limpa os marcadores de "pendente" das tabelas tocadas.
 * Chamado automaticamente quando a fila offline esvazia.
 */
export async function reconcileDirty(): Promise<void> {
  const tables = [...touchedTables];
  touchedTables.clear();
  for (const table of tables) {
    try {
      const rows = await getRows<Row>(table);
      const ids = rows
        .map((r) => r.id)
        .filter((id): id is string => typeof id === "string");
      if (ids.length) await clearDirty(table, ids);
    } catch (err) {
      console.warn("[local-write] falha ao reconciliar", table, err);
    }
  }
}

let watching = false;

/** Liga a reconciliação automática (idempotente). */
export function startLocalWriteReconciler(): () => void {
  if (watching || typeof window === "undefined") return () => undefined;
  watching = true;
  const unsubscribe = subscribe((size) => {
    if (size === 0 && touchedTables.size) void reconcileDirty();
  });
  if (queueSize() === 0) void reconcileDirty();
  return () => {
    watching = false;
    unsubscribe();
  };
}

/** Apenas para testes. */
export function __resetLocalWriteForTests() {
  touchedTables.clear();
  watching = false;
}

// Aliases compatíveis com o antigo `offline-supabase`, para que as telas
// existentes passem a espelhar localmente apenas trocando o import.
export {
  localInsert as offlineInsert,
  localUpsert as offlineUpsert,
  localUpdate as offlineUpdate,
  localDelete as offlineDelete,
};
