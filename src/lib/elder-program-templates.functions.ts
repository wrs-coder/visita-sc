import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordTemplateChanged } from "./template-propagation.functions";

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

export type ElderProgramEventDTO = {
  id: string;
  section: ElderSection;
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

function toEventDTO(r: Record<string, unknown>): ElderProgramEventDTO {
  const g = (k: string) => (r[k] ?? null) as string | null;
  return {
    id: r.id as string,
    section: r.section as ElderSection,
    sort_order: (r.sort_order as number | null) ?? 0,
    slot_label: g("slot_label"),
    companion: g("companion"),
    family_name: g("family_name"),
    address: g("address"),
    family_members: g("family_members"),
    spiritual_info: g("spiritual_info"),
    category: (r.category as ElderProgramEventDTO["category"] | null) ?? null,
    person_name: g("person_name"),
    contact: g("contact"),
    health_info: g("health_info"),
    purpose: (r.purpose as ElderProgramEventDTO["purpose"] | null) ?? null,
    full_name: g("full_name"),
    field_group: g("field_group"),
    info: g("info"),
    suggested_by: g("suggested_by"),
    subject: g("subject"),
    sources: g("sources"),
  };
}

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
    if (!tpl || !canView) {
      return {
        ok: false as const,
        error: "Não autorizado.",
        template: null,
        sections: { pastoral: "", encouragement: "", recommendations: "", local: "" },
        slots: [] as Array<{ id: string; label: string; sort_order: number }>,
        events: [] as ElderProgramEventDTO[],
      };
    }
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
      error: null,
      template: { id: tpl.id, name: tpl.name, congregation_id: tpl.congregation_id },
      sections,
      slots: ((slots.data ?? []) as Array<{ id: string; label: string; sort_order: number }>).map((s) => ({
        id: s.id, label: s.label, sort_order: s.sort_order,
      })),
      events: ((events.data ?? []) as Array<Record<string, unknown>>).map(toEventDTO),
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
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.`, id: null };
    }
    const { data: row, error } = await supabaseAdmin
      .from("elder_program_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: data.congregationId ?? null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha.", id: null };
    return { ok: true as const, error: null, id: row.id };
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
    if (Object.keys(patch).length === 0) return { ok: true as const, error: null };
    const { error } = await supabaseAdmin.from("elder_program_templates").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
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
    return { ok: true as const, error: null };
  });

export const duplicateElderProgramTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: nameSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id,superintendent_id").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado.", id: null };
    const { count } = await supabaseAdmin
      .from("elder_program_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.`, id: null };
    }
    const { data: row, error } = await supabaseAdmin
      .from("elder_program_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha.", id: null };
    const newId = row.id;
    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections").select("section,additional_info").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_slots").select("label,sort_order").eq("template_id", data.id),
      supabaseAdmin.from("elder_program_template_events").select("*").eq("template_id", data.id),
    ]);
    if (secs.data?.length) {
      await supabaseAdmin.from("elder_program_template_sections").insert(
        secs.data.map((r) => ({ template_id: newId, section: r.section, additional_info: r.additional_info ?? "" })),
      );
    }
    if (slots.data?.length) {
      await supabaseAdmin.from("elder_program_template_slots").insert(
        slots.data.map((r) => ({ template_id: newId, label: r.label, sort_order: r.sort_order ?? 0 })),
      );
    }
    if (events.data?.length) {
      const rows = events.data.map((r) => {
        const dto = toEventDTO(r as Record<string, unknown>);
        return {
          template_id: newId,
          section: dto.section,
          sort_order: dto.sort_order,
          slot_label: dto.slot_label,
          companion: dto.companion,
          family_name: dto.family_name,
          address: dto.address,
          family_members: dto.family_members,
          spiritual_info: dto.spiritual_info,
          category: dto.category,
          person_name: dto.person_name,
          contact: dto.contact,
          health_info: dto.health_info,
          purpose: dto.purpose,
          full_name: dto.full_name,
          field_group: dto.field_group,
          info: dto.info,
          suggested_by: dto.suggested_by,
          subject: dto.subject,
          sources: dto.sources,
        };
      });
      await supabaseAdmin.from("elder_program_template_events").insert(rows);
    }
    return { ok: true as const, error: null, id: newId };
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

    const sectionRows = SECTIONS.map((s) => ({
      template_id: data.templateId,
      section: s,
      additional_info: data.sections[s] ?? "",
    }));
    await supabaseAdmin.from("elder_program_template_sections").upsert(sectionRows, { onConflict: "template_id,section" });

    await supabaseAdmin.from("elder_program_template_slots").delete().eq("template_id", data.templateId);
    if (data.pastoralSlots.length) {
      await supabaseAdmin.from("elder_program_template_slots").insert(
        data.pastoralSlots.map((label, i) => ({ template_id: data.templateId, label, sort_order: i })),
      );
    }

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

    return { ok: true as const, error: null };
  });

// --- Apply template to visit (idempotent merge) ---

type SectionTable = "elder_pastoral_visits" | "elder_encouragements" | "elder_recommendations" | "elder_local_matters";

function tableFor(section: ElderSection): SectionTable {
  if (section === "pastoral") return "elder_pastoral_visits";
  if (section === "encouragement") return "elder_encouragements";
  if (section === "recommendations") return "elder_recommendations";
  return "elder_local_matters";
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Content signature so we can re-link rows whose template_event_id changed on resave. */
function signatureOfDTO(dto: ElderProgramEventDTO): string {
  switch (dto.section) {
    case "pastoral":
      return `p|${norm(dto.slot_label)}|${norm(dto.family_name)}|${norm(dto.address)}`;
    case "encouragement":
      return `e|${norm(dto.category)}|${norm(dto.person_name)}|${norm(dto.address)}`;
    case "recommendations":
      return `r|${norm(dto.purpose)}|${norm(dto.full_name)}|${norm(dto.field_group)}`;
    case "local":
      return `l|${norm(dto.subject)}|${norm(dto.suggested_by)}`;
  }
}

function signatureOfRow(section: ElderSection, r: Record<string, unknown>): string {
  const g = (k: string) => (r[k] as string | null) ?? null;
  switch (section) {
    case "pastoral":
      return `p|${norm(g("slot_label"))}|${norm(g("family_name"))}|${norm(g("address"))}`;
    case "encouragement":
      return `e|${norm(g("category"))}|${norm(g("person_name"))}|${norm(g("address"))}`;
    case "recommendations":
      return `r|${norm(g("purpose"))}|${norm(g("full_name"))}|${norm(g("field_group"))}`;
    case "local":
      return `l|${norm(g("subject"))}|${norm(g("suggested_by"))}`;
  }
}

/** Non-destructive patch: only fills NULL/empty fields. Preserves manual edits. */
function nonDestructivePatch(
  section: ElderSection,
  dto: ElderProgramEventDTO,
  existing: Record<string, unknown>,
  templateEventId: string,
): Record<string, unknown> {
  const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
  const patch: Record<string, unknown> = {};
  const fields: Record<ElderSection, Array<keyof ElderProgramEventDTO>> = {
    pastoral: ["slot_label", "companion", "family_name", "address", "family_members", "spiritual_info"],
    encouragement: ["category", "person_name", "address", "contact", "health_info", "spiritual_info"],
    recommendations: ["purpose", "full_name", "family_members", "field_group", "info"],
    local: ["suggested_by", "subject", "sources", "info"],
  };
  for (const f of fields[section]) {
    const cur = existing[f as string];
    const next = dto[f];
    if (isEmpty(cur) && !isEmpty(next)) patch[f as string] = next;
  }
  // Always re-link so future applies match by ID.
  patch.template_event_id = templateEventId;
  patch.source = "template";
  return patch;
}

async function insertSnapshotEvent(visitId: string, dto: ElderProgramEventDTO, templateEventId: string) {
  const base = {
    visit_id: visitId,
    source: "template" as const,
    template_event_id: templateEventId,
    sort_order: dto.sort_order,
  };
  if (dto.section === "pastoral") {
    return supabaseAdmin.from("elder_pastoral_visits").insert({
      ...base,
      slot_label: dto.slot_label,
      companion: dto.companion,
      family_name: dto.family_name,
      address: dto.address,
      family_members: dto.family_members,
      spiritual_info: dto.spiritual_info,
    });
  }
  if (dto.section === "encouragement") {
    return supabaseAdmin.from("elder_encouragements").insert({
      ...base,
      category: dto.category,
      person_name: dto.person_name,
      address: dto.address,
      contact: dto.contact,
      health_info: dto.health_info,
      spiritual_info: dto.spiritual_info,
    });
  }
  if (dto.section === "recommendations") {
    return supabaseAdmin.from("elder_recommendations").insert({
      ...base,
      purpose: dto.purpose,
      full_name: dto.full_name,
      family_members: dto.family_members,
      field_group: dto.field_group,
      info: dto.info,
    });
  }
  return supabaseAdmin.from("elder_local_matters").insert({
    ...base,
    suggested_by: dto.suggested_by,
    subject: dto.subject,
    sources: dto.sources,
    info: dto.info,
  });
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
    if (!visit) return { ok: false as const, error: "Visita não encontrada.", inserted: 0, updated: 0, skipped: 0 };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) {
      return { ok: false as const, error: "Não autorizado.", inserted: 0, updated: 0, skipped: 0 };
    }

    const templateId = data.templateId ?? visit.elder_program_template_id ?? null;
    if (!templateId) return { ok: false as const, error: "Nenhum modelo selecionado.", inserted: 0, updated: 0, skipped: 0 };
    const { data: tpl } = await supabaseAdmin
      .from("elder_program_templates").select("id").eq("id", templateId).eq("superintendent_id", userId).maybeSingle();
    if (!tpl) return { ok: false as const, error: "Modelo não encontrado.", inserted: 0, updated: 0, skipped: 0 };

    if (visit.elder_program_template_id !== templateId) {
      await supabaseAdmin.from("visits").update({ elder_program_template_id: templateId }).eq("id", data.visitId);
    }

    const [secs, slots, events] = await Promise.all([
      supabaseAdmin.from("elder_program_template_sections").select("section,additional_info").eq("template_id", templateId),
      supabaseAdmin.from("elder_program_template_slots").select("label,sort_order").eq("template_id", templateId).order("sort_order"),
      supabaseAdmin.from("elder_program_template_events").select("*").eq("template_id", templateId).order("section").order("sort_order"),
    ]);

    const sectionRows = SECTIONS.map((s) => {
      const found = (secs.data ?? []).find((r) => r.section === s);
      return { visit_id: data.visitId, section: s, additional_info: found?.additional_info ?? "" };
    });
    await supabaseAdmin.from("elder_program_visit_sections").upsert(sectionRows, { onConflict: "visit_id,section" });

    await supabaseAdmin.from("elder_program_visit_slots").delete().eq("visit_id", data.visitId);
    if (slots.data?.length) {
      await supabaseAdmin.from("elder_program_visit_slots").insert(
        slots.data.map((s, i) => ({ visit_id: data.visitId, label: s.label, sort_order: s.sort_order ?? i })),
      );
    }

    // Pre-load existing visit rows per section for ID + signature matching.
    const byTplId: Record<ElderSection, Map<string, Record<string, unknown>>> = {
      pastoral: new Map(), encouragement: new Map(), recommendations: new Map(), local: new Map(),
    };
    const bySig: Record<ElderSection, Map<string, Record<string, unknown>>> = {
      pastoral: new Map(), encouragement: new Map(), recommendations: new Map(), local: new Map(),
    };
    for (const section of SECTIONS) {
      const { data: rows } = await supabaseAdmin
        .from(tableFor(section)).select("*").eq("visit_id", data.visitId);
      for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
        const tplId = row.template_event_id as string | null;
        if (tplId) byTplId[section].set(tplId, row);
        const sig = signatureOfRow(section, row);
        if (sig && !bySig[section].has(sig)) bySig[section].set(sig, row);
      }
    }
    const usedRowIds = new Set<string>();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    for (const ev of events.data ?? []) {
      const dto = toEventDTO(ev as Record<string, unknown>);
      const section = dto.section;
      // 1) match by template_event_id
      let match = byTplId[section].get(dto.id) ?? null;
      // 2) fallback: match by content signature
      if (!match) {
        const sig = signatureOfDTO(dto);
        const candidate = bySig[section].get(sig);
        if (candidate && !usedRowIds.has(candidate.id as string)) match = candidate;
      }
      if (match) {
        const rowId = match.id as string;
        if (usedRowIds.has(rowId)) { skipped++; continue; }
        usedRowIds.add(rowId);
        const patch = nonDestructivePatch(section, dto, match, dto.id);
        const { error } = await (supabaseAdmin.from(tableFor(section)) as unknown as {
          update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        }).update(patch).eq("id", rowId);
        if (error) return { ok: false as const, error: error.message, inserted, updated, skipped };
        updated++;
      } else {
        const ins = await insertSnapshotEvent(data.visitId, dto, dto.id);
        if (ins.error) return { ok: false as const, error: ins.error.message, inserted, updated, skipped };
        inserted++;
      }
    }
    return { ok: true as const, error: null, inserted, updated, skipped };
  });
