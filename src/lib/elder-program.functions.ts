import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAdmin,
  toDTO,
  ensureCanEdit,
  applyUpdate,
  type ElderVisitEventDTO,
  type SectionT,
} from "./elder-program.server";

export type { ElderVisitEventDTO };

const sectionEnum = z.enum(["pastoral", "encouragement", "recommendations", "local"]);

const textOpt = z.string().trim().max(1000).nullable().optional();
const longTextOpt = z.string().max(4000).nullable().optional();

export const listElderProgramForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = getAdmin();
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
    const elderCong = (roles ?? []).find((r) => r.role === "elder")?.congregation_id ?? null;
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", v.congregation_id).maybeSingle();
    const isSuperOfThisCong = cong?.superintendent_id === userId;
    const isElderOfThisCong = elderCong === v.congregation_id;
    if (!isSuperOfThisCong && !isElderOfThisCong) {
      return { ok: false as const, error: "Não autorizado.", ...empty };
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

export const updateElderProgramEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = getAdmin();
    const { userId } = context;
    const auth = await ensureCanEdit(supabaseAdmin, userId, data.visitId);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    const res = await applyUpdate(supabaseAdmin, data.section, data.id, data.visitId, data.patch as Record<string, unknown>);
    if (res.error) return { ok: false as const, error: res.error.message };
    return { ok: true as const, error: null };
  });

export const createElderRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = getAdmin();
    const { userId } = context;
    const auth = await ensureCanEdit(supabaseAdmin, userId, data.visitId);
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
    const supabaseAdmin = getAdmin();
    const { userId } = context;
    const auth = await ensureCanEdit(supabaseAdmin, userId, data.visitId);
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
