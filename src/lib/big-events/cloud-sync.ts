// Grandes Eventos: baixar/enviar direto da nuvem, ignorando a cópia do aparelho.
// A cópia local (espelho) é substituída pelo que veio da nuvem, porque linhas
// marcadas como apagadas no aparelho com o mesmo carimbo nunca voltariam sozinhas.
import { supabase } from "@/integrations/supabase/client";
import { withNetworkWindow } from "@/lib/net-policy";
import { markTableStale } from "@/lib/response-cache";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["circuit_big_events"]["Row"];
type PartRow = Database["public"]["Tables"]["circuit_big_event_parts"]["Row"];
const EV = "circuit_big_events";
const PT = "circuit_big_event_parts";

const maxStamp = (rows: Array<{ updated_at: string }>) =>
  rows.reduce<string | null>((m, r) => (!m || r.updated_at > m ? r.updated_at : m), null);

/** Troca o conteúdo da tabela local pelas linhas dadas (lista completa). */
export async function replaceMirror(table: string, rows: Array<Record<string, unknown> & { updated_at: string }>) {
  const { clearTable, upsertRows, ensureTable, setCursor } = await import("@/lib/local-db");
  await clearTable(table);
  await ensureTable(table);
  if (rows.length) await upsertRows(table, rows);
  await setCursor(table, maxStamp(rows));
  markTableStale(table);
}

/** Evento com data já passou da limpeza diária (apagado no 3º dia depois da data). */
export function isExpiredBigEvent(eventDate: string | null | undefined, today: string): boolean {
  if (!eventDate) return false;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2);
  return eventDate < d.toISOString().slice(0, 10);
}

/**
 * Junta a lista da nuvem com os eventos que só existem no aparelho. Eventos
 * apagados na nuvem (exclusão registrada) ou já vencidos pela limpeza diária
 * não voltam, porque reenviá-los ressuscitaria o que foi apagado.
 */
export function mergeWithLocal(
  cloudEv: EventRow[], cloudPt: PartRow[], localEv: EventRow[], localPt: PartRow[],
  deletedIds: ReadonlySet<string> = new Set(), today?: string,
) {
  const inCloud = new Set(cloudEv.map((e) => e.id));
  const onlyEv = localEv.filter((e) => !inCloud.has(e.id) && !deletedIds.has(e.id) && !(today && isExpiredBigEvent(e.event_date, today)));
  const onlyIds = new Set(onlyEv.map((e) => e.id));
  const cloudPtIds = new Set(cloudPt.map((p) => p.id));
  const onlyPt = localPt.filter((p) => onlyIds.has(p.event_id) && !cloudPtIds.has(p.id));
  return { events: [...cloudEv, ...onlyEv], parts: [...cloudPt, ...onlyPt], localOnly: [...onlyIds] };
}

/** Baixa todos os eventos e partes da conta direto da nuvem, mantendo os que só existem no aparelho. */
export async function downloadAllEvents(): Promise<{ events: EventRow[]; parts: PartRow[]; localOnly: string[]; cloudCount: number }> {
  return withNetworkWindow(async () => {
    const [ev, pt] = await Promise.all([
      supabase.from(EV).select("*").order("event_date", { ascending: true }),
      supabase.from(PT).select("*").order("sort_order"),
    ]);
    if (ev.error) throw ev.error;
    if (pt.error) throw pt.error;
    const { getRows } = await import("@/lib/local-db");
    const [lev, lpt] = await Promise.all([getRows<EventRow>(EV).catch(() => []), getRows<PartRow>(PT).catch(() => [])]);
    const deleted = await fetchDeletedEventIds();
    const today = new Date().toISOString().slice(0, 10);
    const m = mergeWithLocal(ev.data ?? [], pt.data ?? [], lev, lpt, deleted, today);
    await replaceMirror(EV, m.events);
    await replaceMirror(PT, m.parts);
    return { ...m, cloudCount: (ev.data ?? []).length };
  });
}

/** Ids de Grandes Eventos apagados na nuvem (exclusões registradas). Falha = nenhum. */
async function fetchDeletedEventIds(): Promise<Set<string>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("sync_tombstones" as never) as any)
      .select("row_id").eq("table_name", EV).limit(5000);
    if (error) return new Set();
    return new Set(((data ?? []) as Array<{ row_id: string }>).map((r) => r.row_id));
  } catch { return new Set(); }
}

/** Apaga um evento e suas partes da cópia deste aparelho. */
export async function forgetEventLocally(id: string, partIds: string[]) {
  const { markDeleted } = await import("@/lib/local-db");
  await markDeleted(EV, [id]).catch(() => 0);
  if (partIds.length) await markDeleted(PT, partIds).catch(() => 0);
  markTableStale(EV); markTableStale(PT);
}

/** Envia para a nuvem os eventos (e partes) dados — usado para os que só existem no aparelho. */
export async function pushAllLocal(events: EventRow[], parts: PartRow[]): Promise<number> {
  if (!events.length) return 0;
  const ids = new Set(events.map((e) => e.id));
  await withNetworkWindow(async () => {
    const { error } = await supabase.from(EV).upsert(events);
    if (error) throw error;
    const ps = parts.filter((p) => ids.has(p.event_id));
    for (let i = 0; i < ps.length; i += 200) {
      const r = await supabase.from(PT).upsert(ps.slice(i, i + 200));
      if (r.error) throw r.error;
    }
  });
  return events.length;
}

/** Junta a versão da nuvem de um evento à lista atual (substitui só ele). */
export function mergeEvent(events: EventRow[], parts: PartRow[], id: string, ev: EventRow | null, evParts: PartRow[]) {
  const restEv = events.filter((e) => e.id !== id);
  const restPt = parts.filter((p) => p.event_id !== id);
  return { events: ev ? [...restEv, ev] : restEv, parts: [...restPt, ...evParts] };
}

/** Recebe um evento da nuvem. `null` = não existe mais na nuvem. */
export async function pullEvent(id: string): Promise<{ event: EventRow | null; parts: PartRow[] }> {
  return withNetworkWindow(async () => {
    const [ev, pt] = await Promise.all([
      supabase.from(EV).select("*").eq("id", id).maybeSingle(),
      supabase.from(PT).select("*").eq("event_id", id).order("sort_order"),
    ]);
    if (ev.error) throw ev.error;
    if (pt.error) throw pt.error;
    const { getRows } = await import("@/lib/local-db");
    const [lev, lpt] = await Promise.all([getRows<EventRow>(EV), getRows<PartRow>(PT)]);
    const m = mergeEvent(lev, lpt, id, ev.data ?? null, pt.data ?? []);
    await replaceMirror(EV, m.events);
    await replaceMirror(PT, m.parts);
    return { event: ev.data ?? null, parts: pt.data ?? [] };
  });
}

/** Envia um evento e suas partes para a nuvem e devolve a versão gravada. */
export async function pushEvent(ev: EventRow, evParts: PartRow[]) {
  await withNetworkWindow(async () => {
    const { error } = await supabase.from(EV).upsert(ev);
    if (error) throw error;
    if (evParts.length) {
      const r = await supabase.from(PT).upsert(evParts);
      if (r.error) throw r.error;
    }
  });
  return pullEvent(ev.id);
}
