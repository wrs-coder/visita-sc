// Responde leituras simples do backend usando o espelho do celular.
//
// Entende o formato de endereço que o cliente do backend usa para ler uma
// tabela (filtros eq/neq/gt/gte/lt/lte/in/is/like/ilike, order, limit,
// offset, select de colunas simples, contagem). Consultas mais complexas
// (junções entre tabelas, "or") devolvem null: quem chamou usa a cópia
// exata da resposta ou o servidor.

export type Row = Record<string, unknown>;

export type LocalAnswer = {
  status: number;
  body: string | null;
  headers: Record<string, string>;
};

type Filter = { col: string; negate: boolean; op: string; value: string };

const SUPPORTED_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "like", "ilike"]);
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

/** Nome da tabela a partir de /rest/v1/<tabela>. null para rpc e outros. */
export function tableFromRestUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/rest\/v1\/([^/?#]+)$/);
    if (!m || m[1] === "rpc") return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** Lê os filtros do endereço. null quando há algo que não sabemos avaliar. */
export function parseFilters(params: URLSearchParams): Filter[] | null {
  const out: Filter[] = [];
  for (const [key, raw] of params.entries()) {
    if (RESERVED.has(key)) continue;
    if (key === "or" || key === "and" || key.includes(".")) return null;
    let rest = raw;
    let negate = false;
    if (rest.startsWith("not.")) {
      negate = true;
      rest = rest.slice(4);
    }
    const dot = rest.indexOf(".");
    if (dot < 0) return null;
    const op = rest.slice(0, dot);
    if (!SUPPORTED_OPS.has(op)) return null;
    out.push({ col: key, negate, op, value: rest.slice(dot + 1) });
  }
  return out;
}

function parseInList(value: string): string[] {
  const inner = value.replace(/^\(/, "").replace(/\)$/, "");
  const items: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "\\" && quoted && i + 1 < inner.length) {
      cur += inner[++i];
      continue;
    }
    if (ch === "," && !quoted) {
      items.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.length || inner.length) items.push(cur);
  return items;
}

function asComparable(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function compare(rowValue: unknown, raw: string): number | null {
  const a = asComparable(rowValue);
  if (a === null) return null;
  if (typeof a === "number") {
    const b = Number(raw);
    if (Number.isNaN(b)) return null;
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (typeof a === "boolean") {
    const b = raw === "true";
    return a === b ? 0 : a ? 1 : -1;
  }
  return a === raw ? 0 : a < raw ? -1 : 1;
}

function likeToRegex(pattern: string, insensitive: boolean): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[*%]/g, ".*");
  return new RegExp(`^${escaped}$`, insensitive ? "is" : "s");
}

function matchOne(row: Row, f: Filter): boolean {
  const v = row[f.col];
  let ok: boolean;
  switch (f.op) {
    case "eq": ok = compare(v, f.value) === 0; break;
    case "neq": { const c = compare(v, f.value); ok = c !== null && c !== 0; break; }
    case "gt": { const c = compare(v, f.value); ok = c !== null && c > 0; break; }
    case "gte": { const c = compare(v, f.value); ok = c !== null && c >= 0; break; }
    case "lt": { const c = compare(v, f.value); ok = c !== null && c < 0; break; }
    case "lte": { const c = compare(v, f.value); ok = c !== null && c <= 0; break; }
    case "in": ok = parseInList(f.value).some((item) => compare(v, item) === 0); break;
    case "is":
      if (f.value === "null") ok = v === null || v === undefined;
      else if (f.value === "true") ok = v === true;
      else if (f.value === "false") ok = v === false;
      else ok = false;
      break;
    case "like": ok = typeof v === "string" && likeToRegex(f.value, false).test(v); break;
    case "ilike": ok = typeof v === "string" && likeToRegex(f.value, true).test(v); break;
    default: ok = false;
  }
  return f.negate ? !ok : ok;
}

export function rowMatches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => matchOne(row, f));
}

type OrderTerm = { col: string; desc: boolean; nullsFirst: boolean };

function parseOrder(raw: string | null): OrderTerm[] | null {
  if (!raw) return [];
  const terms: OrderTerm[] = [];
  for (const part of raw.split(",")) {
    const bits = part.trim().split(".");
    const col = bits[0];
    if (!col || col.includes("(")) return null;
    const desc = bits.includes("desc");
    const nullsFirst = bits.includes("nullsfirst") ? true : bits.includes("nullslast") ? false : desc;
    terms.push({ col, desc, nullsFirst });
  }
  return terms;
}

function sortRows(rows: Row[], terms: OrderTerm[]): Row[] {
  if (!terms.length) return rows;
  return [...rows].sort((a, b) => {
    for (const t of terms) {
      const av = asComparable(a[t.col]);
      const bv = asComparable(b[t.col]);
      if (av === bv) continue;
      if (av === null) return t.nullsFirst ? -1 : 1;
      if (bv === null) return t.nullsFirst ? 1 : -1;
      const c = av < bv ? -1 : 1;
      return t.desc ? -c : c;
    }
    return 0;
  });
}

function parseSelect(raw: string | null): string[] | "*" | null {
  if (!raw) return "*";
  const cleaned = raw.replace(/\s+/g, "");
  if (cleaned === "*") return "*";
  if (/[()!:]/.test(cleaned)) return null;
  const cols = cleaned.split(",").filter(Boolean);
  if (cols.some((c) => c === "*")) return "*";
  return cols;
}

/**
 * Avalia a leitura no espelho. Devolve null quando a consulta não é simples
 * o bastante para responder com segurança.
 */
export function evaluatePostgrest(
  url: string,
  rows: Row[],
  opts: { method?: string; accept?: string | null; prefer?: string | null } = {},
): LocalAnswer | null {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return null;
  }
  const filters = parseFilters(params);
  if (!filters) return null;
  const order = parseOrder(params.get("order"));
  if (!order) return null;
  const select = parseSelect(params.get("select"));
  if (!select) return null;

  let matched = rows.filter((r) => rowMatches(r, filters));
  matched = sortRows(matched, order);
  const total = matched.length;
  const offset = Number(params.get("offset") ?? "0") || 0;
  const limitRaw = params.get("limit");
  const limit = limitRaw === null ? null : Number(limitRaw);
  if (offset) matched = matched.slice(offset);
  if (limit !== null && !Number.isNaN(limit)) matched = matched.slice(0, limit);

  const projected =
    select === "*"
      ? matched
      : matched.map((r) => {
          const o: Row = {};
          for (const c of select) o[c] = r[c] ?? null;
          return o;
        });

  const headers: Record<string, string> = { "content-type": "application/json; charset=utf-8" };
  const prefer = opts.prefer ?? "";
  if (/count=(exact|planned|estimated)/.test(prefer)) {
    headers["content-range"] = projected.length
      ? `${offset}-${offset + projected.length - 1}/${total}`
      : `*/${total}`;
  }
  const head = (opts.method ?? "GET").toUpperCase() === "HEAD";
  const accept = opts.accept ?? "";
  if (accept.includes("vnd.pgrst.object")) {
    if (projected.length !== 1) {
      return {
        status: 406,
        headers,
        body: JSON.stringify({
          code: "PGRST116",
          details: `The result contains ${projected.length} rows`,
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned",
        }),
      };
    }
    return { status: 200, headers, body: head ? null : JSON.stringify(projected[0]) };
  }
  return { status: 200, headers, body: head ? null : JSON.stringify(projected) };
}
