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

/** Baixa todos os eventos e partes da conta direto da nuvem. */
export async function downloadAllEvents(): Promise<{ events: EventRow[]; parts: PartRow[] }> {
  return withNetworkWindow(async () => {
    const [ev, pt] = await Promise.all([
      supabase.from(EV).select("*").order("event_date", { ascending: true }),
      supabase.from(PT).select("*").order("sort_order"),
    ]);
    if (ev.error) throw ev.error;
    if (pt.error) throw pt.error;
    const events = ev.data ?? [], parts = pt.data ?? [];
    await replaceMirror(EV, events);
    await replaceMirror(PT, parts);
    return { events, parts };
  });
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
