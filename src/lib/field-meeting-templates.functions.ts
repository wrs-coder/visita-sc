import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 24;

export const FIELD_MODALITIES = [
  "casa_em_casa",
  "estudos_revisitas",
  "telefone",
  "cartas",
  "telefone_cartas",
  "grupo_de_campo",
] as const;

export const FIELD_MODALITY_LABELS: Record<(typeof FIELD_MODALITIES)[number], string> = {
  casa_em_casa: "Pregação de casa em casa",
  estudos_revisitas: "Estudos e revisitas",
  telefone: "Telefone",
  cartas: "Cartas",
  telefone_cartas: "Telefone + Cartas",
  grupo_de_campo: "Grupo de campo",
};

const modalitySchema = z.enum(FIELD_MODALITIES);
const nameSchema = z.string().trim().min(1).max(120);

const itemSchema = z.object({
  day_offset: z.number().int().min(0).max(30),
  period: z.string().trim().min(1).max(20),
  meeting_time: z.string().trim().max(8).nullable().optional(),
  territory_number: z.string().trim().max(60).nullable().optional(),
  territory_location: z.string().trim().max(200).nullable().optional(),
  closing_prayer: z.string().trim().max(200).nullable().optional(),
  sort_order: z.number().int().min(0).max(1000).default(0),
});

export const listFieldMeetingTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: tpls, error } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id,name,congregation_id,modality,created_at,updated_at")
      .eq("superintendent_id", userId)
      .order("created_at");
    if (error) return { ok: false as const, error: error.message };
    const ids = (tpls ?? []).map((t) => t.id);
    let items: Array<{
      id: string; template_id: string; day_offset: number; period: string;
      meeting_time: string | null; territory_number: string | null;
      territory_location: string | null; closing_prayer: string | null; sort_order: number;
    }> = [];
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("field_meeting_template_items")
        .select("*")
        .in("template_id", ids)
        .order("sort_order");
      items = (data ?? []) as typeof items;
    }
    return { ok: true as const, templates: tpls ?? [], items };
  });

export const getCongregationFieldModality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ congregationId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("modality")
      .eq("congregation_id", data.congregationId)
      .maybeSingle();
    return { ok: true as const, modality: (row?.modality ?? null) as (typeof FIELD_MODALITIES)[number] | null };
  });

export const createFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: nameSchema,
      modality: modalitySchema.default("casa_em_casa"),
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    if (data.congregationId) {
      const owns = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!owns.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("field_meeting_templates")
        .select("id").eq("congregation_id", data.congregationId).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { data: row, error } = await supabaseAdmin.from("field_meeting_templates")
      .insert({
        superintendent_id: userId,
        name: data.name,
        modality: data.modality,
        congregation_id: data.congregationId ?? null,
      })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, id: row.id };
  });

export const updateFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: nameSchema.optional(),
      modality: modalitySchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const patch: { name?: string; modality?: (typeof FIELD_MODALITIES)[number] } = {};
    if (data.name) patch.name = data.name;
    if (data.modality) patch.modality = data.modality;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin.from("field_meeting_templates").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const linkFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), congregationId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    if (data.congregationId) {
      const ownsCong = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!ownsCong.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("field_meeting_templates")
        .select("id").eq("congregation_id", data.congregationId).neq("id", data.id).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { error } = await supabaseAdmin.from("field_meeting_templates")
      .update({ congregation_id: data.congregationId }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const duplicateFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), name: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin.from("field_meeting_templates")
      .select("id,superintendent_id,modality").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { count } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin.from("field_meeting_templates")
      .insert({ superintendent_id: userId, name: data.name, modality: src.modality, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    const { data: srcItems } = await supabaseAdmin
      .from("field_meeting_template_items").select("*").eq("template_id", data.id);
    if (srcItems && srcItems.length) {
      await supabaseAdmin.from("field_meeting_template_items").insert(
        srcItems.map((it) => ({
          template_id: row.id,
          day_offset: it.day_offset,
          period: it.period,
          meeting_time: it.meeting_time,
          territory_number: it.territory_number,
          territory_location: it.territory_location,
          closing_prayer: it.closing_prayer,
          sort_order: it.sort_order,
        })),
      );
    }
    return { ok: true as const, id: row.id };
  });

export const deleteFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("field_meeting_templates").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const replaceFieldMeetingTemplateItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      templateId: z.string().uuid(),
      items: z.array(itemSchema),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    await supabaseAdmin.from("field_meeting_template_items").delete().eq("template_id", data.templateId);
    if (data.items.length) {
      const rows = data.items.map((it, i) => ({
        template_id: data.templateId,
        day_offset: it.day_offset,
        period: it.period,
        meeting_time: it.meeting_time || null,
        territory_number: it.territory_number || null,
        territory_location: it.territory_location || null,
        closing_prayer: it.closing_prayer || null,
        sort_order: it.sort_order ?? i,
      }));
      const { error } = await supabaseAdmin.from("field_meeting_template_items").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

// Apply the field-meeting template linked to the visit's congregation, seeding rows in field_meetings.
export const applyFieldMeetingTemplateForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits").select("id,start_date,congregation_id").eq("id", data.visitId).maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: tpl } = await supabaseAdmin
      .from("field_meeting_templates").select("id").eq("congregation_id", visit.congregation_id).maybeSingle();
    if (!tpl) return { ok: true as const, applied: 0 };
    const { data: items } = await supabaseAdmin
      .from("field_meeting_template_items").select("*").eq("template_id", tpl.id).order("sort_order");
    if (!items?.length) return { ok: true as const, applied: 0 };
    const start = new Date(visit.start_date + "T00:00:00");
    const dateAt = (off: number) => {
      const d = new Date(start); d.setDate(d.getDate() + off);
      return d.toISOString().slice(0, 10);
    };
    const rows = items.map((it) => ({
      visit_id: data.visitId,
      event_date: dateAt(it.day_offset),
      period: it.period || "Manhã",
      meeting_time: it.meeting_time,
      territory_number: it.territory_number,
      territory_location: it.territory_location,
      closing_prayer: it.closing_prayer,
      is_active: true,
    }));
    const { error } = await supabaseAdmin.from("field_meetings").insert(rows);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, applied: rows.length };
  });
