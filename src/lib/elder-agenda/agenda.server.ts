// Leitura/gravação da pauta dos anciãos com o cliente de serviço. Só chamar depois de conferir quem pede.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  RECOMMENDATION_PURPOSE, emptyAgenda, emptyAuto, isLocked, mergeAgenda, normalizeAgenda, normalizeBlocks, withoutPrivate,
  type AgendaAuto, type AgendaPayload, type AgendaRole,
} from "./agenda";

export interface AgendaDTO {
  ok: true; visitId: string; visitTitle: string; congregation: string; range: string;
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

const fmtRange = (a: string, b: string) => {
  const d = (s: string) => s.split("-").reverse().slice(0, 2).join("/");
  return `${d(a)} a ${d(b)}/${b.slice(0, 4)}`;
};

export async function loadAgenda(visitId: string, role: AgendaRole): Promise<AgendaDTO | null> {
  const { data: v } = await supabaseAdmin.from("visits").select("id,title,start_date,end_date,congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return null;
  const [{ data: cong }, { data: row }, { data: meet }, { data: recs }, { data: locs }] = await Promise.all([
    supabaseAdmin.from("congregations").select("name,superintendent_id").eq("id", v.congregation_id).maybeSingle(),
    supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions,updated_at").eq("visit_id", visitId).maybeSingle(),
    supabaseAdmin.from("elders_servants_meetings").select("meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visitId).limit(1),
    supabaseAdmin.from("elder_recommendations").select("id,purpose,full_name,family_members,field_group,info").eq("visit_id", visitId).order("sort_order").order("created_at"),
    supabaseAdmin.from("elder_local_matters").select("id,suggested_by,subject,sources,info").eq("visit_id", visitId).order("sort_order").order("created_at"),
  ]);
  const m = meet?.[0];
  const auto: AgendaAuto = {
    ...emptyAuto(),
    meetingAt: m?.meeting_at ?? null, location: m?.location ?? null, theme: m?.theme ?? null,
    openingPrayer: m?.opening_prayer ?? null, closingPrayer: m?.closing_prayer ?? null,
    recommendations: (recs ?? []).map((r) => ({
      id: r.id,
      title: [r.full_name, r.purpose ? RECOMMENDATION_PURPOSE[r.purpose] : null].filter(Boolean).join(" — ") || "Recomendação",
      family: r.family_members ?? "", fieldGroup: r.field_group ?? "", info: r.info ?? "",
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
    ok: true, visitId, visitTitle: v.title, congregation: cong?.name ?? "", range: fmtRange(v.start_date, v.end_date), role,
    payload: role === "sc" ? payload : withoutPrivate(payload), auto, updatedAt: row?.updated_at ?? null,
  };
}

export async function saveAgenda(visitId: string, role: AgendaRole, incomingRaw: unknown): Promise<string | null | "locked"> {
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
  const merged = mergeAgenda(current, incoming, role);
  const { data, error } = await supabaseAdmin.from("elder_meeting_agendas").upsert(
    { visit_id: visitId, superintendent_id: cong.superintendent_id, payload: merged as never, permissions: {} as never },
    { onConflict: "visit_id" },
  ).select("updated_at").single();
  if (error) throw new Error("Não foi possível salvar a pauta.");
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
  return p.blocks.some((b) => b.cards.some((c) => (role === "sc" || c.type !== "private") && c.attachments.some((a) => a.cloudPath === path)));
}

export async function signedAttachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from(AGENDA_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
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
