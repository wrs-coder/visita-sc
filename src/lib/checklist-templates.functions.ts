import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 24;

const itemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).max(10000),
});

export const listChecklistTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: tpls, error } = await supabaseAdmin
      .from("checklist_templates")
      .select("id,name,congregation_id,created_at,updated_at")
      .eq("superintendent_id", userId)
      .order("created_at");
    if (error) return { ok: false as const, error: error.message };
    const ids = (tpls ?? []).map((t) => t.id);
    let items: Array<{ id: string; template_id: string; title: string; description: string | null; sort_order: number }> = [];
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("checklist_template_items")
        .select("id,template_id,title,description,sort_order")
        .in("template_id", ids)
        .order("sort_order");
      items = (data ?? []) as typeof items;
    }
    return { ok: true as const, templates: tpls ?? [], items };
  });

export const createChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(1).max(120),
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("checklist_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    if (data.congregationId) {
      const owns = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!owns.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("checklist_templates")
        .select("id").eq("congregation_id", data.congregationId).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { data: row, error } = await supabaseAdmin.from("checklist_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: data.congregationId ?? null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, id: row.id };
  });

export const renameChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("checklist_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("checklist_templates").update({ name: data.name }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const linkChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), congregationId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("checklist_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    if (data.congregationId) {
      const ownsCong = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!ownsCong.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("checklist_templates")
        .select("id").eq("congregation_id", data.congregationId).neq("id", data.id).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { error } = await supabaseAdmin.from("checklist_templates")
      .update({ congregation_id: data.congregationId }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const duplicateChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin.from("checklist_templates")
      .select("id,superintendent_id").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { count } = await supabaseAdmin
      .from("checklist_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin.from("checklist_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    const { data: items } = await supabaseAdmin.from("checklist_template_items")
      .select("title,description,sort_order").eq("template_id", data.id).order("sort_order");
    if (items && items.length) {
      const rows = items.map((it) => ({
        template_id: row.id,
        title: it.title,
        description: it.description,
        sort_order: it.sort_order,
      }));
      await supabaseAdmin.from("checklist_template_items").insert(rows);
    }
    return { ok: true as const, id: row.id };
  });

export const deleteChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("checklist_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("checklist_templates").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const replaceChecklistTemplateItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      templateId: z.string().uuid(),
      items: z.array(itemSchema).max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("checklist_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    await supabaseAdmin.from("checklist_template_items").delete().eq("template_id", data.templateId);
    if (data.items.length) {
      const rows = data.items.map((it, i) => ({
        template_id: data.templateId,
        title: it.title,
        description: it.description ?? null,
        sort_order: it.sort_order ?? i,
      }));
      const { error } = await supabaseAdmin.from("checklist_template_items").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
    await supabaseAdmin.from("checklist_templates").update({ updated_at: new Date().toISOString() }).eq("id", data.templateId);
    return { ok: true as const };
  });

// Aplica um modelo de checklist a uma visita específica (igual ao fluxo do
// modelo de programação). Semeia checklist_items a partir dos itens do template.
export const applyChecklistTemplateForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), templateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits").select("id,congregation_id").eq("id", data.visitId).maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: tpl } = await supabaseAdmin
      .from("checklist_templates").select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!tpl) return { ok: false as const, error: "Modelo não encontrado." };

    await supabaseAdmin.from("visits").update({ checklist_template_id: data.templateId }).eq("id", data.visitId);

    const { data: items } = await supabaseAdmin
      .from("checklist_template_items").select("title,description,sort_order")
      .eq("template_id", data.templateId).order("sort_order");
    if (!items?.length) {
      const now = new Date().toISOString();
      await supabaseAdmin.from("visits").update({ last_applied_at: now }).eq("id", data.visitId);
      return { ok: true as const, applied: 0, skipped: 0, lastAppliedAt: now };
    }

    // Merge NÃO-DESTRUTIVO: ignora títulos já presentes para esta visita.
    const { data: existing } = await supabaseAdmin
      .from("checklist_items").select("title").eq("visit_id", data.visitId);
    const have = new Set((existing ?? []).map((r) => (r.title ?? "").trim().toLowerCase()));
    const rows = items
      .filter((it) => !have.has((it.title ?? "").trim().toLowerCase()))
      .map((it) => ({
        visit_id: data.visitId,
        title: it.title,
        description: it.description,
        sort_order: it.sort_order,
        status: "pending" as const,
      }));
    const skipped = items.length - rows.length;
    if (rows.length) {
      const { error } = await supabaseAdmin.from("checklist_items").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
    const now = new Date().toISOString();
    await supabaseAdmin.from("visits").update({ last_applied_at: now }).eq("id", data.visitId);
    return { ok: true as const, applied: rows.length, skipped, lastAppliedAt: now };
  });
