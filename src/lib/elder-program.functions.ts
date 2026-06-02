import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sectionEnum = z.enum(["pastoral", "encouragement", "recommendations", "local"]);
type SectionT = z.infer<typeof sectionEnum>;

const sectionToTable: Record<SectionT, string> = {
  pastoral: "elder_pastoral_visits",
  encouragement: "elder_encouragements",
  recommendations: "elder_recommendations",
  local: "elder_local_matters",
};

const textOpt = z.string().trim().max(1000).nullable().optional();
const longTextOpt = z.string().max(4000).nullable().optional();

async function ensureCanEdit(userId: string, visitId: string) {
  // Lê visit + congregation; permite super e anciãos com permissão de edição.
  const { data: v } = await supabaseAdmin
    .from("visits").select("id,congregation_id").eq("id", visitId).maybeSingle();
  if (!v) return { ok: false as const, error: "Visita não encontrada." };
  const { data: cong } = await supabaseAdmin
    .from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
  if (cong?.superintendent_id === userId) return { ok: true as const, isSuper: true, visit: v };
  // Ancião com permissão de edição
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role,elder_position,congregation_id").eq("user_id", userId);
  const elderRow = (roles ?? []).find((r) => r.role === "elder" && r.congregation_id === v.congregation_id);
  if (elderRow && elderRow.elder_position && elderRow.elder_position !== "corpo") {
    return { ok: true as const, isSuper: false, visit: v };
  }
  return { ok: false as const, error: "Não autorizado." };
}

export const listElderProgramForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Qualquer membro da congregação pode ler.
    const { data: v } = await supabaseAdmin
      .from("visits").select("id,congregation_id").eq("id", data.visitId).maybeSingle();
    if (!v) return { ok: false as const, error: "Visita não encontrada." };
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role,congregation_id").eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
    const elderCong = (roles ?? []).find((r) => r.role === "elder")?.congregation_id ?? null;
    if (!isSuper && elderCong !== v.congregation_id) {
      // Verifica se é o super da congregação
      const { data: cong } = await supabaseAdmin
        .from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
      if (cong?.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
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
      sections,
      slots: (slots.data ?? []) as Array<{ id: string; label: string; sort_order: number }>,
      pastoral: (pastoral.data ?? []) as Array<Record<string, unknown> & { id: string }>,
      encouragement: (enc.data ?? []) as Array<Record<string, unknown> & { id: string }>,
      recommendations: (rec.data ?? []) as Array<Record<string, unknown> & { id: string }>,
      local: (loc.data ?? []) as Array<Record<string, unknown> & { id: string }>,
    };
  });

// === Update fields no card ===
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

export const updateElderProgramEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return auth;
    const table = sectionToTable[data.section];
    const { error } = await supabaseAdmin.from(table).update(data.patch).eq("id", data.id).eq("visit_id", data.visitId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// === Cria recomendação manual (apenas seção 03) ===
export const createElderRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return auth;
    // Define sort_order = max+1
    const { data: rows } = await supabaseAdmin
      .from("elder_recommendations").select("sort_order").eq("visit_id", data.visitId).order("sort_order", { ascending: false }).limit(1);
    const next = (rows?.[0]?.sort_order ?? -1) + 1;
    const { data: row, error } = await supabaseAdmin
      .from("elder_recommendations")
      .insert({ visit_id: data.visitId, source: "manual", sort_order: next })
      .select("*").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, row };
  });

export const deleteElderProgramEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), visitId: z.string().uuid(), section: sectionEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const auth = await ensureCanEdit(userId, data.visitId);
    if (!auth.ok) return auth;
    const table = sectionToTable[data.section];
    // Apenas recommendations pode ser apagada por ancião comum (RLS já enforça).
    // Para outras seções, exigir super.
    if (data.section !== "recommendations" && !auth.isSuper) {
      return { ok: false as const, error: "Apenas o superintendente pode excluir este card." };
    }
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id).eq("visit_id", data.visitId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
