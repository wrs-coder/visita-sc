// Propagação leve de alterações de modelos para visitas futuras.
//
// Filosofia (sustentável + segura + não-invasiva):
//  - Quando um modelo é salvo, registramos UMA pendência por visita futura
//    da congregação vinculada (start_date > hoje). Operação fire-and-forget:
//    se falhar, o salvamento do modelo NÃO é interrompido.
//  - A pendência é apenas um "aviso": não muda dados da visita. O usuário
//    decide se quer reaplicar o modelo (usando o botão "Aplicar modelo"
//    que já existe em cada aba) ou dispensar o aviso.
//  - A limpeza automática (pg_cron diário 04:00) remove pendências de
//    visitas que já começaram.
//
// O ganho real: anciãos sabem que o superintendente atualizou o modelo,
// sem que o app reescreva dados que eles já preencheram.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TEMPLATE_TYPES = [
  "field_meeting",
  "meeting_talk",
  "checklist",
  "elder_program",
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  field_meeting: "Reuniões para serviço de campo",
  meeting_talk: "Reuniões e discursos",
  checklist: "Checklist",
  elder_program: "Programação com anciãos",
};

const TEMPLATE_TABLE: Record<TemplateType, string> = {
  field_meeting: "field_meeting_templates",
  meeting_talk: "meeting_talk_templates",
  checklist: "checklist_templates",
  elder_program: "elder_program_templates",
};

/**
 * Helper interno chamado pelos *.functions.ts dos 4 tipos de modelo após
 * um salvamento bem-sucedido. Nunca lança — apenas registra log em caso de
 * erro. Sustentabilidade: 1 SELECT + 1 UPSERT em lote, sem laços por visita.
 */
export async function recordTemplateChanged(
  templateType: TemplateType,
  templateId: string,
): Promise<void> {
  try {
    const table = TEMPLATE_TABLE[templateType];
    const adminAny = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (c: string, v: unknown) => { maybeSingle: () => Promise<{ data: { id: string; congregation_id: string | null; name: string | null } | null }> };
          in: (c: string, v: string[]) => Promise<{ data: Array<{ id: string; name: string | null }> | null }>;
        };
      };
    };
    const { data: tpl } = await adminAny
      .from(table)
      .select("id,congregation_id,name")
      .eq("id", templateId)
      .maybeSingle();
    if (!tpl?.congregation_id) return; // modelo "livre" — sem congregação vinculada

    const today = new Date().toISOString().slice(0, 10);
    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id")
      .eq("congregation_id", tpl.congregation_id)
      .gt("start_date", today);

    if (!visits?.length) return;

    // Gera UM backup PDF por alteração e reaproveita o mesmo path em todas
    // as pendências (econômico em storage e CPU).
    const { generateTemplateBackupPdf } = await import("./template-backup.server");
    const backupPath = await generateTemplateBackupPdf({
      table,
      templateType,
      templateId,
      congregationId: tpl.congregation_id,
      templateName: tpl.name,
    });

    const visitIds = visits.map((v) => v.id);
    await supabaseAdmin
      .from("visit_pending_updates")
      .delete()
      .in("visit_id", visitIds)
      .eq("template_type", templateType)
      .eq("template_id", templateId)
      .is("resolved_at", null);

    const rows = visitIds.map((vid) => ({
      visit_id: vid,
      template_type: templateType,
      template_id: templateId,
      diff: { changed_at: new Date().toISOString() },
      backup_pdf_path: backupPath,
    }));
    await supabaseAdmin.from("visit_pending_updates").insert(rows);
  } catch (err) {
    // Fire-and-forget: log só no servidor.
    // eslint-disable-next-line no-console
    console.warn("[template-propagation] recordTemplateChanged failed:", err);
  }
}

/**
 * Server fn para listar pendências de uma congregação (para o badge no
 * dashboard). Apenas conta — não retorna conteúdo sensível.
 */
export const countPendingUpdatesForCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ congregationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id")
      .eq("congregation_id", data.congregationId)
      .gt("start_date", today);
    const ids = (visits ?? []).map((v) => v.id);
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
}

/**
 * Lista pendências (não resolvidas) com título de visita e nome do modelo
 * resolvidos para exibição no diálogo.
 */
export const listPendingUpdatesForCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ congregationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; items: PendingUpdateRow[] } | { ok: false; error: string }> => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: visits, error: vErr } = await supabaseAdmin
      .from("visits")
      .select("id,title,start_date")
      .eq("congregation_id", data.congregationId)
      .gt("start_date", today);
    if (vErr) return { ok: false, error: vErr.message };
    if (!visits?.length) return { ok: true, items: [] };

    const visitIds = visits.map((v) => v.id);
    const { data: rows, error } = await supabaseAdmin
      .from("visit_pending_updates")
      .select("id,visit_id,template_type,template_id,diff,created_at")
      .in("visit_id", visitIds)
      .is("resolved_at", null)
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    if (!rows?.length) return { ok: true, items: [] };

    // Resolve nomes de modelos em lote.
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

    const visitMap = new Map(visits.map((v) => [v.id, v]));
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
        };
      }),
    };
  });

/**
 * Marca uma pendência como resolvida (dispensada). O conteúdo da visita
 * não é alterado — para reaplicar o modelo o usuário usa o botão
 * "Aplicar modelo" existente em cada aba.
 */
export const dismissPendingUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("visit_pending_updates")
      .update({ resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/**
 * Dispensa todas as pendências de uma visita (atalho para o dashboard).
 */
export const dismissAllPendingUpdatesForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("visit_pending_updates")
      .update({ resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("visit_id", data.visitId)
      .is("resolved_at", null);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
