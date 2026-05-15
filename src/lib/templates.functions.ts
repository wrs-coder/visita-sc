import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  kind: z.enum(["study", "meal", "transport"]),
  day_offset: z.number().int().min(0).max(30),
  payload: z.record(z.string(), z.unknown()),
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
    let items: Array<{ id: string; template_id: string; kind: string; day_offset: number; payload: Record<string, unknown>; sort_order: number }> = [];
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
      slot: z.number().int().min(1).max(3),
      name: z.string().trim().min(1).max(120),
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
        payload: it.payload,
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
    const { supabase } = context;
    const { error } = await supabase.rpc("apply_template_to_visit", {
      _visit_id: data.visitId,
      _template_id: data.templateId,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
