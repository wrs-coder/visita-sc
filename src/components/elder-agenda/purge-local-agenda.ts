// "Finalizar a visita" no aparelho do SC: apaga a cópia da pauta e os anexos guardados só aqui (IndexedDB).
// Modelos de pauta e preferências de tela continuam, porque não são dados da visita.
import { clearAgendaCache, readAgendaCache } from "@/lib/elder-agenda/agenda-cache";
import type { AgendaPayload } from "@/lib/elder-agenda/agenda";
import { dropLocal } from "./agenda-attachments";

/** Ids dos anexos (fotos/PDFs/links) de todos os cartões da pauta. */
export function agendaAttachmentIds(p: AgendaPayload): string[] {
  return p.blocks.flatMap((b) => b.cards.flatMap((c) => c.attachments.map((a) => a.id)));
}

export async function purgeLocalAgenda(visitId: string): Promise<void> {
  const scope = `visit.${visitId}`;
  const cached = readAgendaCache(scope);
  clearAgendaCache(scope);
  if (!cached) return;
  const ids = agendaAttachmentIds(cached.payload);
  const results = await Promise.allSettled(ids.map((id) => dropLocal(id)));
  results.forEach((r) => { if (r.status === "rejected") console.error("[purgeLocalAgenda] Erro ao apagar anexo:", r.reason); });
}
