import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Carrega o admin client APENAS no servidor (dentro dos handlers / helpers
// server-only). Module-scope `import` de client.server quebra o code-splitter
// do TanStack quando o arquivo é alcançável a partir de rotas no client.
async function getAdmin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}

const sectionEnum = z.enum(["pastoral", "encouragement", "recommendations", "local"]);
type SectionT = z.infer<typeof sectionEnum>;

const textOpt = z.string().trim().max(1000).nullable().optional();
const longTextOpt = z.string().max(4000).nullable().optional();

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

function toDTO(r: Record<string, unknown>, section: SectionT): ElderVisitEventDTO {
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

async function ensureCanEdit(userId: string, visitId: string) {
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

export const listElderProgramForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: v } = await supabaseAdmin
      .from("visits").select("id,congregation_id").eq("id", data.visitId).maybeSingle();
    const empty = {
      sections: { pastoral: "", encouragement: "", recommendations: "", local: "" } as Record<SectionT, string>,
      slots: [] as Array<{ id: string; label: string; sort_order: number }>,
      pastoral: [] as ElderVisitEventDTO[],
      encouragement: [] as ElderVisitEventDTO[],
      recommendations: [] as ElderVisitEventDTO[],
      local: [] as ElderVisitEventDTO[],
    };
    if (!v) return { ok: false as const, error: "Visita não encontrada.", ...empty };
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role,congregation_id").eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
    const elderCong = (roles ?? []).find((r) => r.role === "elder")?.congregation_id ?? null;
    if (!isSuper && elderCong !== v.congregation_id) {
      const { data: cong } = await supabaseAdmin
        .from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
      if (cong?.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado.", ...empty };
    }
    const [secs, slots, pastoral, enc, rec, loc] = await Promise.all([
      supabaseAdmin.from("elder_program_visit_sections").select("section,additional_info").eq("visit_id", data.visitId),
      supabaseAdmin.from("elder_program_visit_slots").select("id,label,sort_order").eq("visit_id", data.visitId).order("sort_order"),
      supabaseAdmin.from("elder_pastoral_visits").select("*").eq("visit_id", data.visitId).order("sort_order").order("created_at"),
      supabaseAdmin.from("elder_encouragements").select("*").eq("visit_id", data.visitId).order("sort_order").order("created_at"),
      supabaseAdmin.from("elder_recommendations").select("*").eq("visit_id", data.visitId).order("sort_order").order("created_at"),
      supabaseAdmin.from("elder_local_matters").select("*").eq("visit_id", data.visitId).order("sort_order").order("created_at"),
    ]);
    const sections: Record<SectionT, string> = { pastoral: "", encouragement: "", recommendations: "", local: "" };
    (secs.data ?? []).forEach((r) => { sections[r.section as SectionT] = r.additional_info ?? ""; });
    return {
      ok: true as const,
      error: null,
      sections,
      slots: ((slots.data ?? []) as Array<{ id: string; label: string; sort_order: number }>).map((s) => ({
        id: s.id, label: s.label, sort_order: s.sort_order,
      })),
      pastoral: ((pastoral.data ?? []) as Array<Record<string, unknown>>).map((r) => toDTO(r, "pastoral")),
      encouragement: ((enc.data ?? []) as Array<Record<string, unknown>>).map((r) => toDTO(r, "encouragement")),
      recommendations: ((rec.data ?? []) as Array<Record<string, unknown>>).map((r) => toDTO(r, "recommendations")),
      local: ((loc.data ?? []) as Array<Record<string, unknown>>).map((r) => toDTO(r, "local")),
    };
  });

const updateInputSchema = z.object({
  id: z.string().uuid(),
  visitId: z.string().uuid(),
  section: sectionEnum,
  patch: z.object({
    sort_order: z.number().int().min(0).max(10000).optional(),
    slot_label: textOpt,
    companion: textOpt,
    family_name: textOpt,
    address: textOpt,
    family_members: longTextOpt,
    spiritual_info: longTextOpt,
    category: z.enum(["inactive", "sick", "special_privileges"]).nullable().optional(),
    person_name: textOpt,
    contact: textOpt,
    health_info: longTextOpt,
    purpose: z.enum(["ministerial_servant", "elder", "redesignation", "removal", "cca_change"]).nullable().optional(),
    full_name: textOpt,
    field_group: textOpt,
    info: longTextOpt,
    suggested_by: textOpt,
    subject: textOpt,
    sources: longTextOpt,
  }),
});

// Cada update precisa ser explícito por tabela para preservar os tipos do Supabase.
async function applyUpdate(section: SectionT, id: string, visitId: string, patch: Record<string, unknown>) {
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

export const updateElderProgramEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    const res = await applyUpdate(data.section, data.id, data.visitId, data.patch as Record<string, unknown>);
    if (res.error) return { ok: false as const, error: res.error.message };
    return { ok: true as const, error: null };
  });

export const createElderRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return { ok: false as const, error: auth.error, row: null };
    const { data: rows } = await supabaseAdmin
      .from("elder_recommendations").select("sort_order").eq("visit_id", data.visitId).order("sort_order", { ascending: false }).limit(1);
    const next = ((rows?.[0]?.sort_order as number | null) ?? -1) + 1;
    const { data: row, error } = await supabaseAdmin
      .from("elder_recommendations")
      .insert({ visit_id: data.visitId, source: "manual", sort_order: next })
      .select("*").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha.", row: null };
    return { ok: true as const, error: null, row: toDTO(row as Record<string, unknown>, "recommendations") };
  });

export const deleteElderProgramEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), visitId: z.string().uuid(), section: sectionEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    if (data.section !== "recommendations" && !auth.isSuper) {
      return { ok: false as const, error: "Apenas o superintendente pode excluir este card." };
    }
    let res;
    if (data.section === "pastoral") {
      res = await supabaseAdmin.from("elder_pastoral_visits").delete().eq("id", data.id).eq("visit_id", data.visitId);
    } else if (data.section === "encouragement") {
      res = await supabaseAdmin.from("elder_encouragements").delete().eq("id", data.id).eq("visit_id", data.visitId);
    } else if (data.section === "recommendations") {
      res = await supabaseAdmin.from("elder_recommendations").delete().eq("id", data.id).eq("visit_id", data.visitId);
    } else {
      res = await supabaseAdmin.from("elder_local_matters").delete().eq("id", data.id).eq("visit_id", data.visitId);
    }
    if (res.error) return { ok: false as const, error: res.error.message };
    return { ok: true as const, error: null };
  });
