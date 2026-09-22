// FASE 1 — Download incremental para o espelho local (`local-db`).
//
// Esta camada continua PASSIVA: nenhuma tela importa este módulo ainda.
// Ela apenas sabe baixar "o que mudou desde a última vez" e gravar no espelho,
// além de aplicar as exclusões feitas em outros aparelhos (tombstones).
//
// Princípios:
// - Nada aqui roda sozinho. Sem efeito colateral no escopo do módulo.
// - Falha de uma tabela nunca aborta as demais nem lança para quem chamou.
// - Nenhuma escrita no servidor: é estritamente leitura.

import { supabase } from "@/integrations/supabase/client";
import {
  getCursor,
  getRows,
  markDeleted,
  setCursor,
  upsertRows,
} from "@/lib/local-db";

export type Row = Record<string, unknown>;

/** Busca as linhas de uma tabela alteradas depois de `since` (ISO ou null). */
export type PullFn = (args: { table: string; since: string | null }) => Promise<Row[]>;

/** Busca tombstones criados depois de `since`. */
export type TombstoneFn = (args: { since: string | null }) => Promise<
  Array<{ table_name: string; row_id: string; deleted_at: string }>
>;

export const TOMBSTONE_CURSOR_TABLE = "__tombstones__";

export type PullResult = { table: string; rows: number; ok: boolean; error?: string };

/**
 * Baixa incrementalmente uma tabela e grava no espelho local.
 * O cursor só avança quando a gravação local foi bem-sucedida.
 */
export async function pullTable(table: string, pull: PullFn): Promise<PullResult> {
  try {
    const since = await getCursor(table);
    const rows = await pull({ table, since });
    if (rows.length) await upsertRows(table, rows);
    return { table, rows: rows.length, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[local-sync] falha ao baixar", table, message);
    return { table, rows: 0, ok: false, error: message };
  }
}

/** Aplica no espelho local as exclusões feitas em outros aparelhos. */
export async function pullTombstones(fetchTombstones: TombstoneFn): Promise<PullResult> {
  try {
    const since = await getCursor(TOMBSTONE_CURSOR_TABLE);
    const items = await fetchTombstones({ since });
    if (!items.length) return { table: TOMBSTONE_CURSOR_TABLE, rows: 0, ok: true };

    const byTable = new Map<string, { ids: string[]; at: string }>();
    let newest = since;
    for (const it of items) {
      if (!it?.table_name || !it?.row_id) continue;
      const entry = byTable.get(it.table_name) ?? { ids: [], at: it.deleted_at };
      entry.ids.push(it.row_id);
      if (it.deleted_at > entry.at) entry.at = it.deleted_at;
      byTable.set(it.table_name, entry);
      if (!newest || it.deleted_at > newest) newest = it.deleted_at;
    }
    for (const [table, entry] of byTable) {
      await markDeleted(table, entry.ids, entry.at);
    }
    await setCursor(TOMBSTONE_CURSOR_TABLE, newest ?? null);
    return { table: TOMBSTONE_CURSOR_TABLE, rows: items.length, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[local-sync] falha ao aplicar exclusões", message);
    return { table: TOMBSTONE_CURSOR_TABLE, rows: 0, ok: false, error: message };
  }
}

export type SyncProgress = { done: number; total: number; table: string };

export type SyncOptions = {
  tables: string[];
  pull: PullFn;
  tombstones?: TombstoneFn;
  onProgress?: (p: SyncProgress) => void;
  signal?: AbortSignal;
};

/** Sincroniza (somente leitura) a lista de tabelas para o espelho local. */
export async function syncTables(opts: SyncOptions): Promise<PullResult[]> {
  const results: PullResult[] = [];
  const total = opts.tables.length + (opts.tombstones ? 1 : 0);
  let done = 0;
  for (const table of opts.tables) {
    if (opts.signal?.aborted) break;
    results.push(await pullTable(table, opts.pull));
    done++;
    opts.onProgress?.({ done, total, table });
  }
  if (opts.tombstones && !opts.signal?.aborted) {
    results.push(await pullTombstones(opts.tombstones));
    done++;
    opts.onProgress?.({ done, total, table: TOMBSTONE_CURSOR_TABLE });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Implementação padrão usando o cliente do backend (somente SELECT).
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;

export const supabasePull: PullFn = async ({ table, since }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(table as never).select("*");
  if (since) q = q.gt("updated_at", since);
  const { data, error } = await q
    .order("updated_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return (data ?? []) as Row[];
};

export const supabaseTombstones: TombstoneFn = async ({ since }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("sync_tombstones" as never).select("table_name,row_id,deleted_at");
  if (since) q = q.gt("deleted_at", since);
  const { data, error } = await q
    .order("deleted_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return (data ?? []) as Array<{ table_name: string; row_id: string; deleted_at: string }>;
};

/** Leitura local pronta para as telas da Fase 2 (ainda não usada). */
export async function readLocal<T extends Row>(
  table: string,
  filter?: (row: T) => boolean,
): Promise<T[]> {
  return getRows<T>(table, filter);
}
