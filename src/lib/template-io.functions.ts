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
      auxiliary_leaders: z.string().trim().max(200).nullable().optional(),
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

const elderSectionEnum = z.enum(["pastoral", "encouragement", "recommendations", "local"]);
const elderTextOpt = z.string().max(4000).nullable().optional();
const elderShortOpt = z.string().max(1000).nullable().optional();

const elderFileSchema = z.object({
  type: z.literal("elder_program_template"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(120),
  sections: z.array(
    z.object({
      section: elderSectionEnum,
      additional_info: elderTextOpt,
    }),
  ).max(20),
  slots: z.array(
    z.object({
      label: z.string().trim().min(1).max(120),
      sort_order: z.number().int().min(0).max(10000).optional(),
    }),
  ).max(50),
  events: z.array(
    z.object({
      section: elderSectionEnum,
      sort_order: z.number().int().min(0).max(10000).optional(),
      slot_label: elderShortOpt,
      companion: elderShortOpt,
      family_name: elderShortOpt,
      address: elderShortOpt,
      family_members: elderTextOpt,
      spiritual_info: elderTextOpt,
      category: z.enum(["inactive", "sick", "special_privileges"]).nullable().optional(),
      person_name: elderShortOpt,
      contact: elderShortOpt,
      health_info: elderTextOpt,
      purpose: z.enum(["ministerial_servant", "elder", "redesignation", "removal", "cca_change"]).nullable().optional(),
      full_name: elderShortOpt,
      field_group: elderShortOpt,
      info: elderTextOpt,
      suggested_by: elderShortOpt,
      subject: elderShortOpt,
      sources: elderTextOpt,
    }),
  ).max(500),
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
      .select("day_offset,period,modality,meeting_time,territory_number,territory_location,auxiliary_leaders,closing_prayer,sort_order")
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
        auxiliary_leaders: it.auxiliary_leaders || null,
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

// ---------- ELDER PROGRAM TEMPLATE ----------

const ELDER_EVENT_COLUMNS = [
  "section","sort_order","slot_label","companion","family_name","address",
  "family_members","spiritual_info","category","person_name","contact",
  "health_info","purpose","full_name","field_group","info",
  "suggested_by","subject","sources",
] as const;

export const exportElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id,name,superintendent_id")
      .eq("id", data.id).maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) {
      return { ok: false as const, error: "Não autorizado." };
    }
    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections")
        .select("section,additional_info").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_slots")
        .select("label,sort_order").eq("template_id", data.id).order("sort_order"),
      supabaseAdmin.from("elder_program_template_events")
        .select(ELDER_EVENT_COLUMNS.join(",")).eq("template_id", data.id)
        .order("section").order("sort_order"),
    ]);
    return {
      ok: true as const,
      file: {
        type: "elder_program_template" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        name: tpl.name,
        sections: secs.data ?? [],
        slots: slots.data ?? [],
        events: events.data ?? [],
      },
    };
  });

export const importElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: elderFileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= 50) {
      return { ok: false as const, error: "Limite de 50 modelos atingido." };
    }
    const { data: row, error } = await supabaseAdmin
      .from("elder_program_templates")
      .insert({ superintendent_id: userId, name: data.file.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    const templateId = row.id;

    if (data.file.sections.length) {
      const rows = data.file.sections.map((s) => ({
        template_id: templateId,
        section: s.section,
        additional_info: s.additional_info ?? null,
      }));
      const ins = await supabaseAdmin.from("elder_program_template_sections").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    if (data.file.slots.length) {
      const rows = data.file.slots.map((s, i) => ({
        template_id: templateId,
        label: s.label,
        sort_order: s.sort_order ?? i,
      }));
      const ins = await supabaseAdmin.from("elder_program_template_slots").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    if (data.file.events.length) {
      const rows = data.file.events.map((e, i) => ({
        template_id: templateId,
        section: e.section,
        sort_order: e.sort_order ?? i,
        slot_label: e.slot_label ?? null,
        companion: e.companion ?? null,
        family_name: e.family_name ?? null,
        address: e.address ?? null,
        family_members: e.family_members ?? null,
        spiritual_info: e.spiritual_info ?? null,
        category: e.category ?? null,
        person_name: e.person_name ?? null,
        contact: e.contact ?? null,
        health_info: e.health_info ?? null,
        purpose: e.purpose ?? null,
        full_name: e.full_name ?? null,
        field_group: e.field_group ?? null,
        info: e.info ?? null,
        suggested_by: e.suggested_by ?? null,
        subject: e.subject ?? null,
        sources: e.sources ?? null,
      }));
      const ins = await supabaseAdmin.from("elder_program_template_events").insert(rows);
      if (ins.error) return { ok: false as const, error: ins.error.message };
    }
    return { ok: true as const, id: templateId };
  });
