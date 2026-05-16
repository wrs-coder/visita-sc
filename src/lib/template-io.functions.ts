import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 24;

// ---------- Schemas for import files ----------

const checklistFileSchema = z.object({
  type: z.literal("checklist_template"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(120),
  items: z.array(
    z.object({
      title: z.string().trim().min(1).max(300),
      description: z.string().trim().max(2000).nullable().optional(),
      sort_order: z.number().int().min(0).max(10000).optional(),
    }),
  ).max(200),
});

const fieldModalityEnum = z.enum([
  "casa_em_casa", "estudos_revisitas", "telefone", "cartas", "telefone_cartas", "grupo_de_campo",
]);

const fieldFileSchema = z.object({
  type: z.literal("field_meeting_template"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(120),
  modality: fieldModalityEnum.default("casa_em_casa"),
  items: z.array(
    z.object({
      day_offset: z.number().int().min(0).max(30),
      period: z.string().trim().min(1).max(20),
      modality: fieldModalityEnum.default("casa_em_casa"),
      meeting_time: z.string().trim().max(8).nullable().optional(),
      territory_number: z.string().trim().max(60).nullable().optional(),
      territory_location: z.string().trim().max(200).nullable().optional(),
      closing_prayer: z.string().trim().max(200).nullable().optional(),
      sort_order: z.number().int().min(0).max(1000).optional(),
    }),
  ).max(200),
});

const programFileSchema = z.object({
  type: z.literal("program_template"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(120),
  slot: z.number().int().min(1).max(3).optional(),
  items: z.array(
    z.object({
      kind: z.enum(["study", "meal", "transport"]),
      day_offset: z.number().int().min(0).max(30),
      payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
      sort_order: z.number().int().min(0).max(1000).optional(),
    }),
  ).max(200),
});

// ---------- EXPORT ----------

export const exportChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("checklist_templates")
      .select("id,name,superintendent_id")
      .eq("id", data.id).maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: items } = await supabaseAdmin
      .from("checklist_template_items")
      .select("title,description,sort_order")
      .eq("template_id", data.id).order("sort_order");
    return {
      ok: true as const,
      file: {
        type: "checklist_template" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        name: tpl.name,
        items: items ?? [],
      },
    };
  });

export const exportFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id,name,modality,superintendent_id")
      .eq("id", data.id).maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: items } = await supabaseAdmin
      .from("field_meeting_template_items")
      .select("day_offset,period,modality,meeting_time,territory_number,territory_location,closing_prayer,sort_order")
      .eq("template_id", data.id).order("sort_order");
    return {
      ok: true as const,
      file: {
        type: "field_meeting_template" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        name: tpl.name,
        modality: tpl.modality,
        items: items ?? [],
      },
    };
  });

export const exportProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("program_templates")
      .select("id,name,slot,superintendent_id")
      .eq("id", data.id).maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: items } = await supabaseAdmin
      .from("program_template_items")
      .select("kind,day_offset,payload,sort_order")
      .eq("template_id", data.id).order("sort_order");
    return {
      ok: true as const,
      file: {
        type: "program_template" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        name: tpl.name,
        slot: tpl.slot,
        items: items ?? [],
      },
    };
  });

// ---------- IMPORT ----------

async function assertUnderLimit(table: "checklist_templates" | "field_meeting_templates", userId: string) {
  const { count } = await supabaseAdmin.from(table)
    .select("id", { count: "exact", head: true }).eq("superintendent_id", userId);
  if ((count ?? 0) >= MAX_TEMPLATES) {
    return `Limite de ${MAX_TEMPLATES} modelos atingido.`;
  }
  return null;
}

export const importChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: checklistFileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const limitErr = await assertUnderLimit("checklist_templates", userId);
    if (limitErr) return { ok: false as const, error: limitErr };
    const { data: row, error } = await supabaseAdmin.from("checklist_templates")
      .insert({ superintendent_id: userId, name: data.file.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    if (data.file.items.length) {
      const rows = data.file.items.map((it, i) => ({
        template_id: row.id,
        title: it.title,
        description: it.description ?? null,
        sort_order: it.sort_order ?? i,
      }));
      const ins = await supabaseAdmin.from("checklist_template_items").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    return { ok: true as const, id: row.id };
  });

export const importFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: fieldFileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const limitErr = await assertUnderLimit("field_meeting_templates", userId);
    if (limitErr) return { ok: false as const, error: limitErr };
    const { data: row, error } = await supabaseAdmin.from("field_meeting_templates")
      .insert({
        superintendent_id: userId,
        name: data.file.name,
        modality: data.file.modality,
        congregation_id: null,
      })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    if (data.file.items.length) {
      const rows = data.file.items.map((it, i) => ({
        template_id: row.id,
        day_offset: it.day_offset,
        period: it.period,
        modality: it.modality,
        meeting_time: it.meeting_time || null,
        territory_number: it.territory_number || null,
        territory_location: it.territory_location || null,
        closing_prayer: it.closing_prayer || null,
        sort_order: it.sort_order ?? i,
      }));
      const ins = await supabaseAdmin.from("field_meeting_template_items").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    return { ok: true as const, id: row.id };
  });

export const importProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: programFileSchema, slot: z.number().int().min(1).max(3) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // program_templates use slot (1..3) per superintendent — upsert into that slot
    const { data: existing } = await supabaseAdmin.from("program_templates")
      .select("id").eq("superintendent_id", userId).eq("slot", data.slot).maybeSingle();
    let templateId: string;
    if (existing) {
      templateId = existing.id;
      await supabaseAdmin.from("program_templates").update({ name: data.file.name }).eq("id", templateId);
      await supabaseAdmin.from("program_template_items").delete().eq("template_id", templateId);
    } else {
      const { data: row, error } = await supabaseAdmin.from("program_templates")
        .insert({ superintendent_id: userId, slot: data.slot, name: data.file.name })
        .select("id").single();
      if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
      templateId = row.id;
    }
    if (data.file.items.length) {
      const rows = data.file.items.map((it, i) => ({
        template_id: templateId,
        kind: it.kind,
        day_offset: it.day_offset,
        payload: it.payload,
        sort_order: it.sort_order ?? i,
      }));
      const ins = await supabaseAdmin.from("program_template_items").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    return { ok: true as const, id: templateId };
  });
