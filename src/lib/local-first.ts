// FASE 2 — Leitura "local-first" nas telas, com o caminho atual como reserva.
//
// Estratégia de RISCO ZERO:
// - Online continua exatamente igual: a tela pede ao servidor e usa a resposta
//   do servidor. A única diferença é que o resultado também é copiado para o
//   espelho local (`local-db`), em segundo plano, sem bloquear a tela.
// - Quando o servidor falha (offline, timeout, erro), em vez de a tela ficar
//   vazia, devolvemos as linhas já guardadas no espelho local.
// - Nenhuma escrita no servidor acontece aqui. Falhas do espelho local nunca
//   derrubam a tela (tudo é engolido com aviso no console).

import { getRow, getRows, upsertRows } from "@/lib/local-db";

export type Row = Record<string, unknown>;

export type SupabaseLike<T> = { data: T | null; error: unknown | null };

export type MirrorReadOptions<T extends Row> = {
  /** Nome da tabela remota (mesmo nome usado no espelho local). */
  table: string;
  /** Consulta atual da tela (Supabase). Deve devolver `{ data, error }`. */
  remote: () => Promise<SupabaseLike<T[]>>;
  /** Filtro aplicado apenas na leitura de reserva (espelho local). */
  filter?: (row: T) => boolean;
  /** Ordenação aplicada apenas na leitura de reserva. */
  sort?: (a: T, b: T) => number;
};

export type MirrorReadResult<T extends Row> = {
  rows: T[];
  /** `local` indica que a resposta veio do espelho (servidor indisponível). */
  source: "remote" | "local";
};

function mirrorAsync<T extends Row>(table: string, rows: T[]) {
  if (!rows.length) return;
  void upsertRows(table, rows).catch((err) =>
    console.warn("[local-first] falha ao espelhar", table, err),
  );
}

async function fallbackRows<T extends Row>(opts: MirrorReadOptions<T>): Promise<T[]> {
  try {
    const rows = await getRows<T>(opts.table, opts.filter);
    return opts.sort ? [...rows].sort(opts.sort) : rows;
  } catch (err) {
    console.warn("[local-first] espelho indisponível", opts.table, err);
    return [];
  }
}

/**
 * Executa a consulta remota atual da tela. Em caso de sucesso, espelha o
 * resultado; em caso de falha, devolve o que já estava salvo no aparelho.
 */
export async function readWithMirror<T extends Row>(
  opts: MirrorReadOptions<T>,
): Promise<MirrorReadResult<T>> {
  try {
    const { data, error } = await opts.remote();
    if (error) throw error;
    const rows = (data ?? []) as T[];
    mirrorAsync(opts.table, rows);
    return { rows, source: "remote" };
  } catch (err) {
    console.warn("[local-first] servidor indisponível, usando dados locais", opts.table, err);
    return { rows: await fallbackRows(opts), source: "local" };
  }
}

/** Versão para consultas que devolvem no máximo uma linha. */
export async function readOneWithMirror<T extends Row>(opts: {
  table: string;
  remote: () => Promise<SupabaseLike<T>>;
  /** Usado na reserva: busca direta por id quando conhecido. */
  id?: string | null;
  filter?: (row: T) => boolean;
  sort?: (a: T, b: T) => number;
}): Promise<{ row: T | null; source: "remote" | "local" }> {
  try {
    const { data, error } = await opts.remote();
    if (error) throw error;
    if (data) mirrorAsync(opts.table, [data]);
    return { row: data ?? null, source: "remote" };
  } catch (err) {
    console.warn("[local-first] servidor indisponível, usando dados locais", opts.table, err);
    try {
      if (opts.id) {
        const row = await getRow<T>(opts.table, opts.id);
        if (row) return { row, source: "local" };
      }
      const rows = await getRows<T>(opts.table, opts.filter);
      const sorted = opts.sort ? [...rows].sort(opts.sort) : rows;
      return { row: sorted[0] ?? null, source: "local" };
    } catch (mirrorErr) {
      console.warn("[local-first] espelho indisponível", opts.table, mirrorErr);
      return { row: null, source: "local" };
    }
  }
}
