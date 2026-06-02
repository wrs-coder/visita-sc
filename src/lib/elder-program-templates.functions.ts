import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 50;

export const SECTIONS = ["pastoral", "encouragement", "recommendations", "local"] as const;
export type ElderSection = (typeof SECTIONS)[number];

const sectionSchema = z.enum(SECTIONS);
const nameSchema = z.string().trim().min(1).max(120);
const textOpt = z.string().trim().max(1000).nullable().optional();
const longTextOpt = z.string().max(4000).nullable().optional();

const eventSchema = z.object({
  section: sectionSchema,
  sort_order: z.number().int().min(0).max(10000).default(0),
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
});

const sectionsPayloadSchema = z.object({
  pastoral: longTextOpt,
  encouragement: longTextOpt,
  recommendations: longTextOpt,
  local: longTextOpt,
});

const savePayloadSchema = z.object({
  templateId: z.string().uuid(),
  sections: sectionsPayloadSchema,
  pastoralSlots: z.array(z.string().trim().min(1).max(120)).max(50),
  events: z.array(eventSchema).max(500),
});

async function getViewer(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role,congregation_id")
    .eq("user_id", userId);
  const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
  const elderCongregationId =
    (roles ?? []).find((r) => r.role === "elder")?.congregation_id ?? null;
  return { isSuper, elderCongregationId };
}

export const listElderProgramTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const viewer = await getViewer(userId);
    if (!viewer.isSuper && !viewer.elderCongregationId) {
      return { ok: true as const, templates: [] };
    }
    const base = supabaseAdmin
      .from("elder_program_templates")
      .select("id,name,congregation_id,created_at,updated_at")
      .order("created_at");
    const query = viewer.isSuper
      ? base.eq("superintendent_id", userId)
      : base.eq("congregation_id", viewer.elderCongregationId!);
    const { data, error } = await query;
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, templates: data ?? [] };
  });

export const getElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const viewer = await getViewer(userId);
    const { data: tpl } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id,name,congregation_id,superintendent_id")
      .eq("id", data.id)
      .maybeSingle();
    const canView =
      !!tpl &&
      (tpl.superintendent_id === userId ||
        (!!viewer.elderCongregationId && tpl.congregation_id === viewer.elderCongregationId));
    if (!canView) return { ok: false as const, error: "Não autorizado." };
    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections").select("section,additional_info").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_slots").select("id,label,sort_order").eq("template_id", data.id).order("sort_order"),
      supabaseAdmin.from("elder_program_template_events").select("*").eq("template_id", data.id).order("section").order("sort_order"),
    ]);
    const sections: Record<ElderSection, string> = {
      pastoral: "", encouragement: "", recommendations: "", local: "",
    };
    (secs.data ?? []).forEach((r) => {
      sections[r.section as ElderSection] = r.additional_info ?? "";
    });
    return {
      ok: true as const,
      template: { id: tpl.id, name: tpl.name, congregation_id: tpl.congregation_id },
      sections,
      slots: (slots.data ?? []) as Array<{ id: string; label: string; sort_order: number }>,
      events: (events.data ?? []) as Array<Record<string, unknown> & { id: string; section: ElderSection; sort_order: number }>,
    };
  });

export const createElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: nameSchema,
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin
      .from("elder_program_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: data.congregationId ?? null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    return { ok: true as const, id: row.id };
  });

export const updateElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: nameSchema.optional(),
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const patch: { name?: string; congregation_id?: string | null } = {};
    if (data.name) patch.name = data.name;
    if (data.congregationId !== undefined) patch.congregation_id = data.congregationId;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin.from("elder_program_templates").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("elder_program_templates").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const duplicateElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: nameSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id,superintendent_id").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { count } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin
      .from("elder_program_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    const newId = row.id;
    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections").select("section,additional_info").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_slots").select("label,sort_order").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_events").select("*").eq("template_id", data.id),
    ]);
    if (secs.data?.length) {
      await supabaseAdmin.from("elder_program_template_sections").insert(
        secs.data.map((r) => ({ template_id: newId, section: r.section, additional_info: r.additional_info })),
      );
    }
    if (slots.data?.length) {
      await supabaseAdmin.from("elder_program_template_slots").insert(
        slots.data.map((r) => ({ template_id: newId, label: r.label, sort_order: r.sort_order })),
      );
    }
    if (events.data?.length) {
      const rows = events.data.map((r) => {
        const { id: _id, template_id: _tid, created_at: _c, updated_at: _u, ...rest } = r as Record<string, unknown> & { id: string; template_id: string; created_at: string; updated_at: string };
        return { ...rest, template_id: newId };
      });
      await supabaseAdmin.from("elder_program_template_events").insert(rows);
    }
    return { ok: true as const, id: newId };
  });

export const saveElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => savePayloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };

    // Sections: upsert by (template_id, section)
    const sectionRows = SECTIONS.map((s) => ({
      template_id: data.templateId,
      section: s,
      additional_info: data.sections[s] ?? "",
    }));
    await supabaseAdmin.from("elder_program_template_sections").upsert(sectionRows, { onConflict: "template_id,section" });

    // Slots: replace
    await supabaseAdmin.from("elder_program_template_slots").delete().eq("template_id", data.templateId);
    if (data.pastoralSlots.length) {
      await supabaseAdmin.from("elder_program_template_slots").insert(
        data.pastoralSlots.map((label, i) => ({ template_id: data.templateId, label, sort_order: i })),
      );
    }

    // Events: replace
    await supabaseAdmin.from("elder_program_template_events").delete().eq("template_id", data.templateId);
    if (data.events.length) {
      const rows = data.events.map((e, i) => ({
        template_id: data.templateId,
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
      await supabaseAdmin.from("elder_program_template_events").insert(rows);
    }

    return { ok: true as const };
  });

const sectionToTable: Record<ElderSection, string> = {
  pastoral: "elder_pastoral_visits",
  encouragement: "elder_encouragements",
  recommendations: "elder_recommendations",
  local: "elder_local_matters",
};

function pickEventFields(section: ElderSection, src: Record<string, unknown>) {
  if (section === "pastoral") {
    return {
      slot_label: src.slot_label ?? null,
      companion: src.companion ?? null,
      family_name: src.family_name ?? null,
      address: src.address ?? null,
      family_members: src.family_members ?? null,
      spiritual_info: src.spiritual_info ?? null,
    };
  }
  if (section === "encouragement") {
    return {
      category: src.category ?? null,
      person_name: src.person_name ?? null,
      address: src.address ?? null,
      contact: src.contact ?? null,
      health_info: src.health_info ?? null,
      spiritual_info: src.spiritual_info ?? null,
    };
  }
  if (section === "recommendations") {
    return {
      purpose: src.purpose ?? null,
      full_name: src.full_name ?? null,
      family_members: src.family_members ?? null,
      field_group: src.field_group ?? null,
      info: src.info ?? null,
    };
  }
  // local
  return {
    suggested_by: src.suggested_by ?? null,
    subject: src.subject ?? null,
    sources: src.sources ?? null,
    info: src.info ?? null,
  };
}

export const applyElderProgramTemplateToVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), templateId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits")
      .select("id,congregation_id,elder_program_template_id")
      .eq("id", data.visitId).maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };

    const templateId = data.templateId ?? (visit as { elder_program_template_id: string | null }).elder_program_template_id ?? null;
    if (!templateId) return { ok: false as const, error: "Nenhum modelo selecionado." };
    const { data: tpl } = await supabaseAdmin
      .from("elder_program_templates").select("id").eq("id", templateId).eq("superintendent_id", userId).maybeSingle();
    if (!tpl) return { ok: false as const, error: "Modelo não encontrado." };

    if ((visit as { elder_program_template_id: string | null }).elder_program_template_id !== templateId) {
      await supabaseAdmin.from("visits").update({ elder_program_template_id: templateId }).eq("id", data.visitId);
    }

    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections").select("section,additional_info").eq("template_id", templateId),
      supabaseAdmin.from("elder_program_template_slots").select("label,sort_order").eq("template_id", templateId).order("sort_order"),
      supabaseAdmin.from("elder_program_template_events").select("*").eq("template_id", templateId).order("section").order("sort_order"),
    ]);

    // Sections (snapshot por seção)
    const sectionRows = SECTIONS.map((s) => {
      const found = (secs.data ?? []).find((r) => r.section === s);
      return { visit_id: data.visitId, section: s, additional_info: found?.additional_info ?? "" };
    });
    await supabaseAdmin.from("elder_program_visit_sections").upsert(sectionRows, { onConflict: "visit_id,section" });

    // Slots: substitui completamente (não mexe em eventos manuais)
    await supabaseAdmin.from("elder_program_visit_slots").delete().eq("visit_id", data.visitId);
    if (slots.data?.length) {
      await supabaseAdmin.from("elder_program_visit_slots").insert(
        slots.data.map((s, i) => ({ visit_id: data.visitId, label: s.label, sort_order: s.sort_order ?? i })),
      );
    }

    // Eventos: insere os do template que ainda não existem na visita (por template_event_id).
    let inserted = 0;
    let skipped = 0;
    for (const ev of events.data ?? []) {
      const section = (ev as { section: ElderSection }).section;
      const table = sectionToTable[section];
      const templateEventId = (ev as { id: string }).id;
      const { data: existing } = await supabaseAdmin
        .from(table).select("id").eq("visit_id", data.visitId).eq("template_event_id", templateEventId).maybeSingle();
      if (existing) { skipped++; continue; }
      const fields = pickEventFields(section, ev as Record<string, unknown>);
      const { error: insErr } = await supabaseAdmin.from(table).insert({
        visit_id: data.visitId,
        source: "template",
        template_event_id: templateEventId,
        sort_order: (ev as { sort_order: number }).sort_order ?? 0,
        ...fields,
      });
      if (insErr) return { ok: false as const, error: insErr.message };
      inserted++;
    }
    return { ok: true as const, inserted, skipped };
  });
