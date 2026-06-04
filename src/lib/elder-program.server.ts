// Server-only helpers for elder-program.functions.ts.
// Lives in a *.server.ts file so it (a) never reaches client bundles and
// (b) is imported into the .functions.ts file — keeping it OUT of the
// sibling scope that the TanStack server-fn splitter strips per handler.

import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";

export type SectionT = "pastoral" | "encouragement" | "recommendations" | "local";

export type ElderVisitEventDTO = {
  id: string;
  visit_id: string;
  section: SectionT;
  source: "template" | "manual";
  template_event_id: string | null;
  sort_order: number;
  slot_label: string | null;
  companion: string | null;
  family_name: string | null;
  address: string | null;
  family_members: string | null;
  spiritual_info: string | null;
  category: "inactive" | "sick" | "special_privileges" | null;
  person_name: string | null;
  contact: string | null;
  health_info: string | null;
  purpose: "ministerial_servant" | "elder" | "redesignation" | "removal" | "cca_change" | null;
  full_name: string | null;
  field_group: string | null;
  info: string | null;
  suggested_by: string | null;
  subject: string | null;
  sources: string | null;
};

export type AdminClient = typeof _admin;

export function getAdmin(): AdminClient {
  return _admin;
}

export function toDTO(r: Record<string, unknown>, section: SectionT): ElderVisitEventDTO {
  const g = (k: string) => (r[k] ?? null) as string | null;
  return {
    id: r.id as string,
    visit_id: r.visit_id as string,
    section,
    source: (r.source as "template" | "manual") ?? "manual",
    template_event_id: (r.template_event_id as string | null) ?? null,
    sort_order: (r.sort_order as number | null) ?? 0,
    slot_label: g("slot_label"),
    companion: g("companion"),
    family_name: g("family_name"),
    address: g("address"),
    family_members: g("family_members"),
    spiritual_info: g("spiritual_info"),
    category: (r.category as ElderVisitEventDTO["category"] | null) ?? null,
    person_name: g("person_name"),
    contact: g("contact"),
    health_info: g("health_info"),
    purpose: (r.purpose as ElderVisitEventDTO["purpose"] | null) ?? null,
    full_name: g("full_name"),
    field_group: g("field_group"),
    info: g("info"),
    suggested_by: g("suggested_by"),
    subject: g("subject"),
    sources: g("sources"),
  };
}

export async function ensureCanEdit(supabaseAdmin: AdminClient, userId: string, visitId: string) {
  const { data: v } = await supabaseAdmin
    .from("visits").select("id,congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return { ok: false as const, error: "Visita não encontrada.", isSuper: false };
  const { data: cong } = await supabaseAdmin
    .from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
  if (cong?.superintendent_id === userId) return { ok: true as const, error: null, isSuper: true };
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role,elder_position,congregation_id").eq("user_id", userId);
  const elderRow = (roles ?? []).find((r) => r.role === "elder" && r.congregation_id === v.congregation_id);
  if (elderRow && elderRow.elder_position && elderRow.elder_position !== "corpo") {
    return { ok: true as const, error: null, isSuper: false };
  }
  return { ok: false as const, error: "Não autorizado.", isSuper: false };
}

export async function applyUpdate(
  supabaseAdmin: AdminClient,
  section: SectionT,
  id: string,
  visitId: string,
  patch: Record<string, unknown>,
) {
  if (section === "pastoral") {
    return supabaseAdmin.from("elder_pastoral_visits").update({
      sort_order: patch.sort_order as number | undefined,
      slot_label: patch.slot_label as string | null | undefined,
      companion: patch.companion as string | null | undefined,
      family_name: patch.family_name as string | null | undefined,
      address: patch.address as string | null | undefined,
      family_members: patch.family_members as string | null | undefined,
      spiritual_info: patch.spiritual_info as string | null | undefined,
    }).eq("id", id).eq("visit_id", visitId);
  }
  if (section === "encouragement") {
    return supabaseAdmin.from("elder_encouragements").update({
      sort_order: patch.sort_order as number | undefined,
      category: patch.category as ElderVisitEventDTO["category"] | undefined,
      person_name: patch.person_name as string | null | undefined,
      address: patch.address as string | null | undefined,
      contact: patch.contact as string | null | undefined,
      health_info: patch.health_info as string | null | undefined,
      spiritual_info: patch.spiritual_info as string | null | undefined,
    }).eq("id", id).eq("visit_id", visitId);
  }
  if (section === "recommendations") {
    return supabaseAdmin.from("elder_recommendations").update({
      sort_order: patch.sort_order as number | undefined,
      purpose: patch.purpose as ElderVisitEventDTO["purpose"] | undefined,
      full_name: patch.full_name as string | null | undefined,
      family_members: patch.family_members as string | null | undefined,
      field_group: patch.field_group as string | null | undefined,
      info: patch.info as string | null | undefined,
    }).eq("id", id).eq("visit_id", visitId);
  }
  return supabaseAdmin.from("elder_local_matters").update({
    sort_order: patch.sort_order as number | undefined,
    suggested_by: patch.suggested_by as string | null | undefined,
    subject: patch.subject as string | null | undefined,
    sources: patch.sources as string | null | undefined,
    info: patch.info as string | null | undefined,
  }).eq("id", id).eq("visit_id", visitId);
}
