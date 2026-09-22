// FASE 0 — Base do Offline-First (Local-First).
//
// Espelho local das tabelas sincronizadas. Esta camada é PASSIVA nesta fase:
// nenhuma tela importa este módulo ainda. Ela apenas fornece a infraestrutura
// para as fases seguintes (download incremental, leitura local, caixa de saída).
//
// Características:
// - Uma "tabela espelho" por tabela remota, guardando linhas por `id`.
// - Cada linha carrega `updatedAt` (carimbo do servidor) e `deletedAt`
//   (marcação de exclusão / tombstone), permitindo sincronização incremental
//   e propagação de exclusões feitas em outro aparelho.
// - Um cursor por tabela (`maior updatedAt já baixado`) para pedir ao servidor
//   somente o que mudou.
// - Armazenamento em IndexedDB (via idb-keyval) criado de forma PREGUIÇOSA,
//   nunca no escopo do módulo — abrir IndexedDB no boot já causou tela preta
//   no WebView Android (4.2.5). Se o IndexedDB falhar, cai para memória, sem
//   lançar erro.
//
// Regra de ouro desta fase: importar este arquivo não pode ter nenhum efeito
// colateral. Tudo é inicializado sob demanda, dentro de funções assíncronas.

export type LocalRow<T = Record<string, unknown>> = {
  id: string;
  /** Conteúdo da linha, exatamente como veio do servidor (ou local). */
  data: T;
  /** Carimbo de última atualização (ISO). Base da resolução de conflito. */
  updatedAt: string | null;
  /** Quando preenchido, a linha foi excluída e não deve aparecer nas telas. */
  deletedAt: string | null;
  /** Escrita local ainda não confirmada pelo servidor. */
  dirty?: boolean;
};

type TableFile<T = Record<string, unknown>> = {
  /** Versão do formato do arquivo da tabela. */
  v: 1;
  /** Maior `updatedAt` já baixado do servidor para esta tabela. */
  cursor: string | null;
  rows: Record<string, LocalRow<T>>;
};

export type LocalDbStats = {
  driver: "idb" | "memory";
  tables: Array<{ table: string; rows: number; deleted: number; cursor: string | null }>;
};

const KEY_PREFIX = "visita-sc:localdb:";
const INDEX_KEY = `${KEY_PREFIX}__tables__`;

// ---------------------------------------------------------------------------
// Driver de armazenamento (KV simples). IndexedDB com fallback para memória.
// ---------------------------------------------------------------------------

type Kv = {
  name: "idb" | "memory";
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
};

const memoryMap = new Map<string, unknown>();

const memoryKv: Kv = {
  name: "memory",
  async get<T>(key: string) {
    return memoryMap.get(key) as T | undefined;
  },
  async set(key: string, value: unknown) {
    memoryMap.set(key, value);
  },
  async del(key: string) {
    memoryMap.delete(key);
  },
};

let kvPromise: Promise<Kv> | null = null;

async function getKv(): Promise<Kv> {
  if (kvPromise) return kvPromise;
  kvPromise = (async (): Promise<Kv> => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return memoryKv;
    }
    try {
      const { createStore, get, set, del } = await import("idb-keyval");
      const store = createStore("visita-sc-localdb", "kv");
      // Sonda: se o IndexedDB estiver bloqueado (modo privado, WebView
      // instável), caímos para memória em vez de quebrar o app.
      await get("__probe__", store);
      return {
        name: "idb",
        get: <T,>(key: string) => get(key, store) as Promise<T | undefined>,
        set: (key: string, value: unknown) => set(key, value, store),
        del: (key: string) => del(key, store),
      };
    } catch (err) {
      console.warn("[local-db] IndexedDB indisponível — usando memória", err);
      return memoryKv;
    }
  })();
  return kvPromise;
}

/** Apenas para testes: força um driver e limpa o estado em memória. */
export function __resetLocalDbForTests() {
  kvPromise = Promise.resolve(memoryKv);
  memoryMap.clear();
  writeChain = Promise.resolve();
}

// ---------------------------------------------------------------------------
// Serialização de escrita: evita corrida de leitura-modificação-escrita.
// ---------------------------------------------------------------------------

let writeChain: Promise<unknown> = Promise.resolve();

function serialize<T>(op: () => Promise<T>): Promise<T> {
  const next = writeChain.then(op, op);
  writeChain = next.catch(() => undefined);
  return next;
}

// ---------------------------------------------------------------------------
// Leitura/escrita do arquivo de uma tabela.
// ---------------------------------------------------------------------------

function tableKey(table: string) {
  return `${KEY_PREFIX}${table}`;
}

function emptyFile<T>(): TableFile<T> {
  return { v: 1, cursor: null, rows: {} };
}

async function readFile<T>(table: string): Promise<TableFile<T>> {
  try {
    const kv = await getKv();
    const raw = await kv.get<TableFile<T>>(tableKey(table));
    if (!raw || typeof raw !== "object" || !raw.rows) return emptyFile<T>();
    return { v: 1, cursor: raw.cursor ?? null, rows: raw.rows };
  } catch (err) {
    console.warn("[local-db] falha ao ler tabela", table, err);
    return emptyFile<T>();
  }
}

async function writeFile<T>(table: string, file: TableFile<T>): Promise<void> {
  try {
    const kv = await getKv();
    await kv.set(tableKey(table), file);
    const index = (await kv.get<string[]>(INDEX_KEY)) ?? [];
    if (!index.includes(table)) {
      await kv.set(INDEX_KEY, [...index, table]);
    }
  } catch (err) {
    console.warn("[local-db] falha ao gravar tabela", table, err);
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

function isNewer(incoming: string | null, current: string | null): boolean {
  if (!current) return true;
  if (!incoming) return false;
  return incoming >= current;
}

function pickId(row: Record<string, unknown>, idField: string): string | null {
  const raw = row[idField];
  if (typeof raw === "string" && raw) return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

export type UpsertOptions = {
  /** Campo usado como chave primária. Padrão: `id`. */
  idField?: string;
  /** Campo de carimbo de atualização. Padrão: `updated_at`. */
  updatedAtField?: string;
  /** Marca as linhas como escrita local pendente. */
  dirty?: boolean;
};

/**
 * Grava linhas vindas do servidor (ou locais) no espelho.
 * Regra de conflito: quem tem `updatedAt` mais recente vence. Linhas locais
 * marcadas como `dirty` só são sobrescritas por um carimbo estritamente maior.
 */
export async function upsertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  opts: UpsertOptions = {},
): Promise<number> {
  if (!rows.length) return 0;
  const idField = opts.idField ?? "id";
  const updatedAtField = opts.updatedAtField ?? "updated_at";
  return serialize(async () => {
    const file = await readFile<T>(table);
    let applied = 0;
    let maxCursor = file.cursor;
    for (const row of rows) {
      const id = pickId(row, idField);
      if (!id) continue;
      const updatedAt =
        typeof row[updatedAtField] === "string" ? (row[updatedAtField] as string) : null;
      const prev = file.rows[id];
      if (prev?.dirty && !opts.dirty) {
        // Escrita local pendente: só o servidor com carimbo estritamente
        // maior pode sobrescrever.
        if (!updatedAt || !prev.updatedAt || updatedAt <= prev.updatedAt) continue;
      } else if (prev && !isNewer(updatedAt, prev.updatedAt)) {
        continue;
      }
      file.rows[id] = {
        id,
        data: row,
        updatedAt,
        deletedAt: null,
        ...(opts.dirty ? { dirty: true } : {}),
      };
      applied++;
      if (updatedAt && (!maxCursor || updatedAt > maxCursor)) maxCursor = updatedAt;
    }
    file.cursor = maxCursor;
    await writeFile(table, file);
    return applied;
  });
}

/** Marca linhas como excluídas (tombstone), preservando o histórico do cursor. */
export async function markDeleted(
  table: string,
  ids: string[],
  deletedAt = new Date().toISOString(),
): Promise<number> {
  if (!ids.length) return 0;
  return serialize(async () => {
    const file = await readFile(table);
    let n = 0;
    for (const id of ids) {
      const prev = file.rows[id];
      if (!prev) {
        file.rows[id] = { id, data: {}, updatedAt: deletedAt, deletedAt };
        n++;
        continue;
      }
      if (prev.deletedAt) continue;
      file.rows[id] = { ...prev, deletedAt, updatedAt: deletedAt };
      n++;
    }
    await writeFile(table, file);
    return n;
  });
}

/** Linhas vivas (sem tombstone) da tabela espelho. */
export async function getRows<T extends Record<string, unknown>>(
  table: string,
  filter?: (row: T) => boolean,
): Promise<T[]> {
  const file = await readFile<T>(table);
  const out: T[] = [];
  for (const row of Object.values(file.rows)) {
    if (row.deletedAt) continue;
    if (filter && !filter(row.data)) continue;
    out.push(row.data);
  }
  return out;
}

export async function getRow<T extends Record<string, unknown>>(
  table: string,
  id: string,
): Promise<T | null> {
  const file = await readFile<T>(table);
  const row = file.rows[id];
  if (!row || row.deletedAt) return null;
  return row.data;
}

/** Linhas com escrita local ainda não confirmada. */
export async function getDirtyRows<T extends Record<string, unknown>>(
  table: string,
): Promise<T[]> {
  const file = await readFile<T>(table);
  return Object.values(file.rows)
    .filter((r) => r.dirty && !r.deletedAt)
    .map((r) => r.data);
}

export async function clearDirty(table: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await serialize(async () => {
    const file = await readFile(table);
    for (const id of ids) {
      const prev = file.rows[id];
      if (prev?.dirty) {
        const next = { ...prev };
        delete next.dirty;
        file.rows[id] = next;
      }
    }
    await writeFile(table, file);
  });
}

/** Cursor de sincronização (maior `updated_at` já baixado). */
export async function getCursor(table: string): Promise<string | null> {
  return (await readFile(table)).cursor;
}

export async function setCursor(table: string, cursor: string | null): Promise<void> {
  await serialize(async () => {
    const file = await readFile(table);
    file.cursor = cursor;
    await writeFile(table, file);
  });
}

export async function clearTable(table: string): Promise<void> {
  await serialize(async () => {
    const kv = await getKv();
    try { await kv.del(tableKey(table)); } catch { /* ignore */ }
  });
}

/** Limpa TODO o espelho local (usado em logout explícito / troca de conta). */
export async function clearLocalDb(): Promise<void> {
  await serialize(async () => {
    const kv = await getKv();
    const index = (await kv.get<string[]>(INDEX_KEY)) ?? [];
    for (const table of index) {
      try { await kv.del(tableKey(table)); } catch { /* ignore */ }
    }
    try { await kv.del(INDEX_KEY); } catch { /* ignore */ }
  });
}

export async function localDbStats(): Promise<LocalDbStats> {
  const kv = await getKv();
  const index = (await kv.get<string[]>(INDEX_KEY)) ?? [];
  const tables: LocalDbStats["tables"] = [];
  for (const table of index) {
    const file = await readFile(table);
    const all = Object.values(file.rows);
    tables.push({
      table,
      rows: all.filter((r) => !r.deletedAt).length,
      deleted: all.filter((r) => r.deletedAt).length,
      cursor: file.cursor,
    });
  }
  return { driver: kv.name, tables };
}
