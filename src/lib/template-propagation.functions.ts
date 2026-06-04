// Pendências leves de propagação de modelos.
// Helpers ficam em template-propagation.server.ts para evitar a remoção
// de siblings feita pelo splitter de server-fns do TanStack.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAdmin,
  TEMPLATE_TABLE,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPES,
  type TemplateType,
} from "./template-propagation.server";

export { TEMPLATE_TYPES };
export type { TemplateType };
// Re-export do helper para os 4 *.templates.functions.ts existentes.
export { recordTemplateChanged } from "./template-propagation.server";

export const countPendingUpdatesForCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ congregationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = getAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id")
      .eq("congregation_id", data.congregationId)
      .gt("start_date", today);
    const ids = (visits ?? []).map((v: { id: string }) => v.id);
    if (!ids.length) return { ok: true as const, count: 0 };
    const { count } = await supabaseAdmin
      .from("visit_pending_updates")
      .select("id", { count: "exact", head: true })
      .in("visit_id", ids)
      .is("resolved_at", null);
    return { ok: true as const, count: count ?? 0 };
  });

export interface PendingUpdateRow {
  id: string;
  visit_id: string;
  visit_title: string | null;
  visit_start_date: string;
  template_type: TemplateType;
  template_type_label: string;
  template_id: string;
  template_name: string | null;
  changed_at: string;
  backup_pdf_path: string | null;
}

export const listPendingUpdatesForCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ congregationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; items: PendingUpdateRow[] } | { ok: false; error: string }> => {
    const supabaseAdmin = getAdmin();
    type VisitRow = { id: string; title: string | null; start_date: string };
    const today = new Date().toISOString().slice(0, 10);
    const { data: visits, error: vErr } = await supabaseAdmin
      .from("visits")
      .select("id,title,start_date")
      .eq("congregation_id", data.congregationId)
      .gt("start_date", today);
    if (vErr) return { ok: false, error: vErr.message };
    if (!visits?.length) return { ok: true, items: [] };

    const visitsTyped = visits as unknown as VisitRow[];
    const visitIds = visitsTyped.map((v) => v.id);
    const { data: rows, error } = await supabaseAdmin
      .from("visit_pending_updates")
      .select("id,visit_id,template_type,template_id,diff,created_at,backup_pdf_path")
      .in("visit_id", visitIds)
      .is("resolved_at", null)
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    if (!rows?.length) return { ok: true, items: [] };

    const byType = new Map<TemplateType, Set<string>>();
    for (const r of rows) {
      const t = r.template_type as TemplateType;
      if (!byType.has(t)) byType.set(t, new Set());
      byType.get(t)!.add(r.template_id);
    }
    const nameMap: Record<string, string | null> = {};
    const adminAny2 = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          in: (c: string, v: string[]) => Promise<{ data: Array<{ id: string; name: string | null }> | null }>;
        };
      };
    };
    for (const [t, ids] of byType) {
      const { data: tpls } = await adminAny2
        .from(TEMPLATE_TABLE[t])
        .select("id,name")
        .in("id", Array.from(ids));
      for (const tpl of tpls ?? []) nameMap[`${t}:${tpl.id}`] = tpl.name;
    }

    const visitMap = new Map(visitsTyped.map((v) => [v.id, v]));
    return {
      ok: true,
      items: rows.map((r) => {
        const v = visitMap.get(r.visit_id);
        const t = r.template_type as TemplateType;
        const diff = (r.diff ?? {}) as { changed_at?: string };
        return {
          id: r.id,
          visit_id: r.visit_id,
          visit_title: v?.title ?? null,
          visit_start_date: v?.start_date ?? "",
          template_type: t,
          template_type_label: TEMPLATE_TYPE_LABELS[t],
          template_id: r.template_id,
          template_name: nameMap[`${t}:${r.template_id}`] ?? null,
          changed_at: diff.changed_at ?? r.created_at,
          backup_pdf_path: (r as { backup_pdf_path: string | null }).backup_pdf_path ?? null,
        };
      }),
    };
  });

export const dismissPendingUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = getAdmin();
    const { error } = await supabaseAdmin
      .from("visit_pending_updates")
      .update({ resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const dismissAllPendingUpdatesForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = getAdmin();
    const { error } = await supabaseAdmin
      .from("visit_pending_updates")
      .update({ resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("visit_id", data.visitId)
      .is("resolved_at", null);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const getBackupSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = getAdmin();
    const { data: signed, error } = await supabaseAdmin.storage
      .from("visit-backups")
      .createSignedUrl(data.path, 60 * 5);
    if (error || !signed) return { ok: false as const, error: error?.message ?? "Falha ao gerar URL" };
    return { ok: true as const, url: signed.signedUrl };
  });
