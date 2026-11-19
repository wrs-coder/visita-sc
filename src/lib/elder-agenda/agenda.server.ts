// Leitura/gravação da pauta dos anciãos com o cliente de serviço. Só chamar depois de conferir quem pede.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  RECOMMENDATION_PURPOSE, emptyAuto, mergeAgenda, normalizeAgenda, normalizePermissions,
  type AgendaAuto, type AgendaPayload, type AgendaPermissions, type AgendaRole,
} from "./agenda";

export interface AgendaDTO {
  ok: true; visitId: string; visitTitle: string; congregation: string; range: string;
  role: AgendaRole; payload: AgendaPayload; permissions: AgendaPermissions; auto: AgendaAuto; updatedAt: string | null;
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
    supabaseAdmin.from("congregations").select("name").eq("id", v.congregation_id).maybeSingle(),
    supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions,updated_at").eq("visit_id", visitId).maybeSingle(),
    supabaseAdmin.from("elders_servants_meetings").select("meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visitId).limit(1),
    supabaseAdmin.from("elder_recommendations").select("id,purpose,full_name,field_group,info").eq("visit_id", visitId).order("sort_order").order("created_at"),
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
      info: [r.field_group ? `Grupo: ${r.field_group}` : "", r.info ?? ""].filter(Boolean).join("\n"),
    })),
    local: (locs ?? []).map((l) => ({ id: l.id, suggestedBy: l.suggested_by ?? "", subject: l.subject ?? "", sources: l.sources ?? "", info: l.info ?? "" })),
  };
  return {
    ok: true, visitId, visitTitle: v.title, congregation: cong?.name ?? "", range: fmtRange(v.start_date, v.end_date), role,
    payload: normalizeAgenda(row?.payload), permissions: normalizePermissions(row?.permissions), auto, updatedAt: row?.updated_at ?? null,
  };
}

export async function saveAgenda(visitId: string, role: AgendaRole, incomingRaw: unknown, permsRaw: unknown): Promise<string | null> {
  const { data: v } = await supabaseAdmin.from("visits").select("congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return null;
  const { data: cong } = await supabaseAdmin.from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
  if (!cong) return null;
  const { data: row } = await supabaseAdmin.from("elder_meeting_agendas").select("payload,permissions").eq("visit_id", visitId).maybeSingle();
  const perms = normalizePermissions(row?.permissions);
  const merged = mergeAgenda(normalizeAgenda(row?.payload), normalizeAgenda(incomingRaw), role, perms);
  const nextPerms = role === "sc" && permsRaw ? normalizePermissions(permsRaw) : perms;
  const { data, error } = await supabaseAdmin.from("elder_meeting_agendas").upsert(
    { visit_id: visitId, superintendent_id: cong.superintendent_id, payload: merged as never, permissions: nextPerms as never },
    { onConflict: "visit_id" },
  ).select("updated_at").single();
  if (error) throw new Error("Não foi possível salvar a pauta.");
  return data.updated_at;
}
