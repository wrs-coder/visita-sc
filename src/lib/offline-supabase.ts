// Drop-in helpers com a mesma forma de retorno do Supabase (`{ error }`),
// mas com fallback offline: se o dispositivo estiver offline OU a chamada
// falhar por rede, a operação é enfileirada e retornamos `{ error: null }`
// (sucesso do ponto de vista do usuário — alteração salva localmente para
// envio futuro).
//
// SEGURANÇA: inserts em tabelas com `congregation_id`/`superintendent_id`
// recebem esses campos auto-injetados a partir do contexto ativo no
// MOMENTO da chamada (não no flush), evitando que mudanças de congregação
// no header desviem writes pendentes.

import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offline-queue";
import { getActiveContext } from "@/lib/active-context";
import { isOfflineMode } from "@/lib/connection-mode";

const TABLES_WITH_CONGREGATION_ID = new Set([
  "congregations",
  "visits",
  "checklist_templates",
  "field_meeting_templates",
  "program_templates",
  "profiles",
  "user_roles",
]);

const TABLES_WITH_SUPERINTENDENT_ID = new Set([
  "congregations",
  "checklist_templates",
  "field_meeting_templates",
  "program_templates",
  "private_notes",
]);

type Row = Record<string, unknown>;
type Payload = Row | Row[];

function enrich(table: string, payload: Payload): Payload {
  const { congregationId, userId } = getActiveContext();
  const apply = (row: Row): Row => {
    const out = { ...row };
    if (TABLES_WITH_CONGREGATION_ID.has(table) && congregationId && out.congregation_id == null) {
      out.congregation_id = congregationId;
    }
    if (TABLES_WITH_SUPERINTENDENT_ID.has(table) && userId && out.superintendent_id == null) {
      out.superintendent_id = userId;
    }
    return out;
  };
  return Array.isArray(payload) ? payload.map(apply) : apply(payload);
}

function isOffline() {
  if (isOfflineMode()) return true;
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as { message?: string }).message ?? "";
  return /network|fetch|failed to fetch|timeout|offline/i.test(msg);
}

export type OfflineResult = { error: { message: string } | null; queued: boolean };

export async function offlineInsert(table: string, payload: Payload): Promise<OfflineResult> {
  const enriched = enrich(table, payload);
  if (isOffline()) {
    enqueue({ table, op: "insert", payload: enriched });
    return { error: null, queued: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).insert(enriched);
  if (error && isNetworkError(error)) {
    enqueue({ table, op: "insert", payload: enriched });
    return { error: null, queued: true };
  }
  return { error: error ?? null, queued: false };
}

export async function offlineUpsert(table: string, payload: Payload): Promise<OfflineResult> {
  const enriched = enrich(table, payload);
  if (isOffline()) {
    enqueue({ table, op: "upsert", payload: enriched });
    return { error: null, queued: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).upsert(enriched);
  if (error && isNetworkError(error)) {
    enqueue({ table, op: "upsert", payload: enriched });
    return { error: null, queued: true };
  }
  return { error: error ?? null, queued: false };
}

export async function offlineUpdate(
  table: string,
  patch: Row,
  match: Record<string, unknown>,
): Promise<OfflineResult> {
  if (isOffline()) {
    enqueue({ table, op: "update", payload: patch, match });
    return { error: null, queued: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (supabase.from(table as any) as any).update(patch);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error && isNetworkError(error)) {
    enqueue({ table, op: "update", payload: patch, match });
    return { error: null, queued: true };
  }
  return { error: error ?? null, queued: false };
}

export async function offlineDelete(
  table: string,
  match: Record<string, unknown>,
): Promise<OfflineResult> {
  if (isOffline()) {
    enqueue({ table, op: "delete", match });
    return { error: null, queued: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (supabase.from(table as any) as any).delete();
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error && isNetworkError(error)) {
    enqueue({ table, op: "delete", match });
    return { error: null, queued: true };
  }
  return { error: error ?? null, queued: false };
}
