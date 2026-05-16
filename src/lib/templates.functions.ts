import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PayloadValue = string | number | boolean | null;
type Payload = Record<string, PayloadValue>;

const payloadSchema: z.ZodType<Payload> = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const itemSchema = z.object({
  kind: z.enum(["study", "meal", "transport"]),
  day_offset: z.number().int().min(0).max(30),
  payload: payloadSchema,
  sort_order: z.number().int().min(0).max(1000).default(0),
});

export const listTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: tpls } = await supabaseAdmin
      .from("program_templates").select("id,slot,name,created_at,updated_at")
      .eq("superintendent_id", userId).order("slot");
    const ids = (tpls ?? []).map((t) => t.id);
    let items: Array<{ id: string; template_id: string; kind: string; day_offset: number; payload: Payload; sort_order: number }> = [];
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("program_template_items").select("*").in("template_id", ids).order("sort_order");
      items = (data ?? []) as typeof items;
    }
    return { ok: true as const, templates: tpls ?? [], items };
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      slot: z.number().int().min(1).max(10),
      name: z.string().trim().min(1).max(120),
      meal_day_notes: z.record(z.string(), z.string().max(2000)).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.from("program_templates")
      .select("id").eq("superintendent_id", userId).eq("slot", data.slot).maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("program_templates").update({ name: data.name }).eq("id", existing.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: existing.id };
    }
    const { data: row, error } = await supabaseAdmin.from("program_templates")
      .insert({ superintendent_id: userId, slot: data.slot, name: data.name }).select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha" };
    return { ok: true as const, id: row.id };
  });

export const replaceTemplateItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      templateId: z.string().uuid(),
      items: z.array(itemSchema),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: t } = await supabaseAdmin.from("program_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!t) return { ok: false as const, error: "Modelo não encontrado." };
    await supabaseAdmin.from("program_template_items").delete().eq("template_id", data.templateId);
    if (data.items.length) {
      const rows = data.items.map((it, i) => ({
        template_id: data.templateId,
        kind: it.kind,
        day_offset: it.day_offset,
        payload: it.payload as Record<string, string | number | boolean | null>,
        sort_order: it.sort_order ?? i,
      }));
      const { error } = await supabaseAdmin.from("program_template_items").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const applyTemplateToVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), templateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits")
      .select("id, start_date, congregation_id")
      .eq("id", data.visitId)
      .maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: tpl } = await supabaseAdmin
      .from("program_templates").select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!tpl) return { ok: false as const, error: "Modelo não encontrado." };

    await supabaseAdmin.from("visits").update({ template_id: data.templateId }).eq("id", data.visitId);

    const { data: items } = await supabaseAdmin
      .from("program_template_items").select("*").eq("template_id", data.templateId).order("sort_order");

    const start = new Date(visit.start_date + "T00:00:00");
    const dateAt = (offset: number) => {
      const d = new Date(start); d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
    const time = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
    const bool = (v: unknown, def: boolean): boolean => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : def);

    for (const it of items ?? []) {
      const p = (it.payload ?? {}) as Record<string, unknown>;
      const targetDate = dateAt(it.day_offset);
      if (it.kind === "study") {
        await supabaseAdmin.from("field_assignments").insert({
          visit_id: data.visitId, event_date: targetDate,
          period: str(p.period) ?? "Manhã",
          meeting_point: str(p.meeting_point), meeting_time: time(p.meeting_time),
          acompanhante: str(p.acompanhante), acompanhante_for: str(p.acompanhante_for),
          contact_phone: str(p.contact_phone), is_active: bool(p.is_active, true),
        });
      } else if (it.kind === "meal") {
        await supabaseAdmin.from("meals").insert({
          visit_id: data.visitId, meal_date: targetDate,
          type: (str(p.type) ?? "lunch") as "lunch" | "dinner" | "breakfast",
          host_name: str(p.host_name) ?? "—",
          location: str(p.location), meal_time: time(p.meal_time),
          notes: str(p.notes), is_active: bool(p.is_active, true),
        });
      } else if (it.kind === "transport") {
        await supabaseAdmin.from("transport_schedule").insert({
          visit_id: data.visitId, event_date: targetDate,
          driver_name: str(p.driver_name) ?? "—",
          contact_phone: str(p.contact_phone),
          description: str(p.description), notes: str(p.notes),
          is_active: bool(p.is_active, true),
        });
      }
    }
    return { ok: true as const };
  });
