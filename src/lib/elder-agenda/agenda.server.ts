// Leitura/gravação da pauta dos anciãos com o cliente de serviço. Só chamar depois de conferir quem pede.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadMergedVisitExtras } from "@/lib/visit-template-extras.server";
import { resolveWeekdaySlot } from "@/lib/today-timeline";
import {
  RECOMMENDATION_PURPOSE, emptyAgenda, removedCloudPaths, emptyAuto, isLocked, isScOnlyCard, mergeAgenda, normalizeAgenda, normalizeBlocks, withoutPrivate,
  type AgendaAuto, type AgendaPayload, type AgendaRole,
} from "./agenda";

export interface AgendaDTO {
  ok: true; visitId: string; visitTitle: string; congregation: string; congregationId: string; startDate: string; range: string;
  role: AgendaRole; payload: AgendaPayload; auto: AgendaAuto; updatedAt: string | null;
}

/** Papel de um usuário com cadastro na visita (null = sem acesso). */
export async function roleForUser(userId: string, visitId: string): Promise<AgendaRole | null> {
  const { data: v } = await supabaseAdmin.from("visits").select("congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return null;
  const { data: cong } = await supabaseAdmin.from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
  if (cong?.superintendent_id === userId) return "sc";
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role,congregation_id,elder_position").eq("user_id", userId);
  const r = (roles ?? []).find((x) => x.role === "elder" && x.congregation_id === v.congregation_id);
  if (!r) return null;
  return r.elder_position && r.elder_position !== "corpo" ? "coordinator" : "elder";
}

/** Visita ativa de quem entra pelo código "Corpo de anciãos" (código da congregação, nunca o da esposa). */
export async function visitForInvite(code: string): Promise<string | null> {
  if (code.endsWith("*")) return null;
  const { data: cong } = await supabaseAdmin.from("congregations").select("id").eq("invite_code", code).maybeSingle();
  if (!cong) return null;
  const { data: visits } = await supabaseAdmin.from("visits").select("id").eq("congregation_id", cong.id).eq("is_active", true)
    .order("start_date", { ascending: false }).limit(1);
  return visits?.[0]?.id ?? null;
}

/** A aba grava a hora escolhida como UTC; devolve a mesma hora "de parede", sem fuso. */
const wallFromDb = (v: string | null) => { if (!v) return null; const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 16) : null; };

const fmtRange = (a: string, b: string) => {
  const d = (s: string) => s.split("-").reverse().slice(0, 2).join("/");
  return `${d(a)} a ${d(b)}/${b.slice(0, 4)}`;
};

export async function loadAgenda(visitId: string, role: AgendaRole): Promise<AgendaDTO | null> {
  const { data: v } = await supabaseAdmin.from("visits").select("id,title,start_date,end_date,congregation_id,meeting_talk_template_id,field_meeting_template_id,template_id").eq("id", visitId).maybeSingle();
  if (!v) return null;
  const [{ data: cong }, { data: row }, { data: meet }, { data: recs }, { data: locs }] = await Promise.all([
    supabaseAdmin.from("congregations").select("name,superintendent_id").eq("id", v.congregation_id).maybeSingle(),
    supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions,updated_at").eq("visit_id", visitId).maybeSingle(),
    supabaseAdmin.from("elders_servants_meetings").select("meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visitId).limit(1),
    supabaseAdmin.from("elder_recommendations").select("id,purpose,full_name,family_members,field_group,info").eq("visit_id", visitId).order("sort_order").order("created_at"),
    supabaseAdmin.from("elder_local_matters").select("id,suggested_by,subject,sources,info").eq("visit_id", visitId).order("sort_order").order("created_at"),
  ]);
  const m = meet?.[0];
  // Mesmo dia/horário da Agenda do Início: o definido pelo SC (modelo/ajuste da visita) vence o gravado na aba.
  let slotAt: string | null = null;
  try {
    const ex = await loadMergedVisitExtras(supabaseAdmin, v, { includeElders: true });
    const days: string[] = [];
    for (let d = new Date(`${v.start_date}T00:00:00Z`); d <= new Date(`${v.end_date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    slotAt = resolveWeekdaySlot(ex.elders?.weekday ?? null, ex.elders?.meeting_time ?? null, days)?.at ?? null;
  } catch { slotAt = null; }
  const auto: AgendaAuto = {
    ...emptyAuto(),
    meetingAt: slotAt ?? wallFromDb(m?.meeting_at ?? null), location: m?.location ?? null, theme: m?.theme ?? null,
    openingPrayer: m?.opening_prayer ?? null, closingPrayer: m?.closing_prayer ?? null,
    recommendations: (recs ?? []).map((r) => ({
      id: r.id,
      title: [r.full_name, r.purpose ? RECOMMENDATION_PURPOSE[r.purpose] : null].filter(Boolean).join(" — ") || "Recomendação",
      family: r.family_members ?? "", fieldGroup: r.field_group ?? "", info: r.info ?? "",
      name: r.full_name ?? "", purpose: r.purpose ? RECOMMENDATION_PURPOSE[r.purpose] ?? "" : "",
    })),
    local: (locs ?? []).map((l) => ({ id: l.id, suggestedBy: l.suggested_by ?? "", subject: l.subject ?? "", sources: l.sources ?? "", info: l.info ?? "" })),
  };
  let payload = normalizeAgenda(row?.payload, row?.permissions);
  if (!row && cong?.superintendent_id) {
    // Pauta nova: começa pelo modelo padrão do SC, se ele tiver um.
    const { data: tpl } = await supabaseAdmin.from("elder_agenda_templates").select("blocks")
      .eq("superintendent_id", cong.superintendent_id).eq("is_default", true).limit(1);
    const blocks = normalizeBlocks(tpl?.[0]?.blocks);
    if (blocks.length) payload = { ...emptyAgenda(), blocks };
  }
  if (role === "sc" && cong?.superintendent_id) void cleanupOldAttachments(cong.superintendent_id).catch(() => undefined);
  return {
    ok: true, visitId, visitTitle: v.title, congregation: cong?.name ?? "", congregationId: v.congregation_id, startDate: v.start_date, range: fmtRange(v.start_date, v.end_date), role,
    payload: role === "sc" ? payload : withoutPrivate(payload), auto, updatedAt: row?.updated_at ?? null,
  };
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveAgenda(visitId: string, role: AgendaRole, incomingRaw: unknown, authorSecret?: string, knownResponseIds?: string[]): Promise<string | null | "locked"> {
  const { data: v } = await supabaseAdmin.from("visits").select("congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return null;
  const { data: cong } = await supabaseAdmin.from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
  if (!cong) return null;
  const { data: row } = await supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions").eq("visit_id", visitId).maybeSingle();
  const current = row ? normalizeAgenda(row.payload, row.permissions) : emptyAgenda();
  if (role !== "sc" && isLocked(current)) return "locked";
  const incoming = normalizeAgenda(incomingRaw);
  // Anexo só pode apontar para a pasta desta visita.
  for (const b of incoming.blocks) for (const c of b.cards) c.attachments = c.attachments.map((a) => (a.cloudPath && !a.cloudPath.startsWith(`${visitId}/`) ? { ...a, cloudPath: "" } : a));
  const authorHash = authorSecret ? await sha256Hex(authorSecret) : null;
  const merged = mergeAgenda(current, incoming, role, Date.now(), authorHash, knownResponseIds ? new Set(knownResponseIds) : null);
  const { data, error } = await supabaseAdmin.from("elder_meeting_agendas").upsert(
    { visit_id: visitId, superintendent_id: cong.superintendent_id, payload: merged as never, permissions: {} as never },
    { onConflict: "visit_id" },
  ).select("updated_at").single();
  if (error) throw new Error("Não foi possível salvar a pauta.");
  // Anexo tirado da pauta: o arquivo sai também da nuvem (só o SC muda anexos).
  if (role === "sc") {
    const gone = removedCloudPaths(current, merged).filter((x) => x.startsWith(`${visitId}/`));
    if (gone.length) { try { await supabaseAdmin.storage.from(AGENDA_BUCKET).remove(gone); } catch { /* a limpeza de 30 dias pega depois */ } }
  }
  return data.updated_at;
}

export const AGENDA_BUCKET = "elder-agenda-files";

/** Payload salvo (com notas privadas) — para conferir anexos. */
export async function savedPayload(visitId: string): Promise<AgendaPayload | null> {
  const { data: row } = await supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions").eq("visit_id", visitId).maybeSingle();
  return row ? normalizeAgenda(row.payload, row.permissions) : null;
}

/** O arquivo está na pauta salva e pode ser visto por este papel (privado só o SC). */
export async function attachmentVisible(visitId: string, path: string, role: AgendaRole): Promise<boolean> {
  if (!path.startsWith(`${visitId}/`)) return false;
  const p = await savedPayload(visitId);
  if (!p) return false;
  return p.blocks.some((b) => b.cards.some((c) => (role === "sc" || !isScOnlyCard(c)) && c.attachments.some((a) => a.cloudPath === path)));
}

export async function signedAttachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from(AGENDA_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** "Finalizar a visita": apaga todos os anexos da pasta da visita e a pauta. Só chamar depois de conferir que é o SC. */
export async function purgeAgenda(visitId: string): Promise<{ files: number }> {
  let files = 0;
  for (let page = 0; page < 20; page++) {
    const { data: list, error } = await supabaseAdmin.storage.from(AGENDA_BUCKET).list(visitId, { limit: 100 });
    if (error) throw new Error(`Anexos: ${error.message}`);
    if (!list?.length) break;
    const { error: rmErr } = await supabaseAdmin.storage.from(AGENDA_BUCKET).remove(list.map((f) => `${visitId}/${f.name}`));
    if (rmErr) throw new Error(`Anexos: ${rmErr.message}`);
    files += list.length;
    if (list.length < 100) break;
  }
  const { error } = await supabaseAdmin.from("elder_meeting_agendas").delete().eq("visit_id", visitId);
  if (error) throw new Error(`Pauta: ${error.message}`);
  return { files };
}

/** Quantas respostas dos anciãos a pauta salva tem (aviso antes de excluir a visita). */
export async function agendaResponseCount(visitId: string): Promise<number> {
  const p = await savedPayload(visitId);
  if (!p) return 0;
  return p.blocks.reduce((n, b) => n + b.cards.reduce((m, c) => m + (c.type === "eldersInfo" ? c.responses.length : 0), 0), 0);
}

/** Apaga da nuvem os anexos de visitas encerradas há mais de 30 dias (deste SC). */
async function cleanupOldAttachments(superintendentId: string) {
  const limit = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data: congs } = await supabaseAdmin.from("congregations").select("id").eq("superintendent_id", superintendentId);
  const ids = (congs ?? []).map((c) => c.id);
  if (!ids.length) return;
  const { data: visits } = await supabaseAdmin.from("visits").select("id").in("congregation_id", ids).lt("end_date", limit)
    .order("end_date", { ascending: false }).limit(20);
  for (const v of visits ?? []) {
    const { data: files } = await supabaseAdmin.storage.from(AGENDA_BUCKET).list(v.id, { limit: 100 });
    if (files?.length) await supabaseAdmin.storage.from(AGENDA_BUCKET).remove(files.map((f) => `${v.id}/${f.name}`));
  }
}
