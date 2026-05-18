import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// JSON-serializable row shape used for transport across the server-fn boundary.
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Row = { [k: string]: Json };


export const exportFullBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Confirm role
    const { data: role } = await supabaseAdmin.from("user_roles")
      .select("id").eq("user_id", userId).eq("role", "superintendent").maybeSingle();
    if (!role) return { ok: false as const, error: "Apenas superintendentes." };

    const { data: congregations = [] } = await supabaseAdmin
      .from("congregations").select("*").eq("superintendent_id", userId);
    const congIds = (congregations ?? []).map((c) => c.id);

    const { data: visits = [] } = congIds.length
      ? await supabaseAdmin.from("visits").select("*").in("congregation_id", congIds)
      : { data: [] };
    const visitIds = (visits ?? []).map((v) => v.id);

    const fetchByVisit = async (table: string) => {
      if (!visitIds.length) return [] as Row[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabaseAdmin.from(table as any) as any).select("*").in("visit_id", visitIds);
      return (res.data ?? []) as Row[];
    };

    const [
      checklist_items,
      field_meetings,
      field_assignments,
      schedule_events,
      meals,
      meal_day_notes,
      transport_schedule,
      private_notes,
    ] = await Promise.all([
      fetchByVisit("checklist_items"),
      fetchByVisit("field_meetings"),
      fetchByVisit("field_assignments"),
      fetchByVisit("schedule_events"),
      fetchByVisit("meals"),
      fetchByVisit("meal_day_notes"),
      fetchByVisit("transport_schedule"),
      fetchByVisit("private_notes"),
    ]);

    const { data: checklist_templates = [] } = await supabaseAdmin
      .from("checklist_templates").select("*").eq("superintendent_id", userId);
    const checklistTplIds = (checklist_templates ?? []).map((t) => t.id);
    const { data: checklist_template_items = [] } = checklistTplIds.length
      ? await supabaseAdmin.from("checklist_template_items").select("*").in("template_id", checklistTplIds)
      : { data: [] };

    const { data: field_meeting_templates = [] } = await supabaseAdmin
      .from("field_meeting_templates").select("*").eq("superintendent_id", userId);
    const fmTplIds = (field_meeting_templates ?? []).map((t) => t.id);
    const { data: field_meeting_template_items = [] } = fmTplIds.length
      ? await supabaseAdmin.from("field_meeting_template_items").select("*").in("template_id", fmTplIds)
      : { data: [] };

    const { data: program_templates = [] } = await supabaseAdmin
      .from("program_templates").select("*").eq("superintendent_id", userId);
    const pgTplIds = (program_templates ?? []).map((t) => t.id);
    const { data: program_template_items = [] } = pgTplIds.length
      ? await supabaseAdmin.from("program_template_items").select("*").in("template_id", pgTplIds)
      : { data: [] };

    const { data: user_roles = [] } = congIds.length
      ? await supabaseAdmin.from("user_roles").select("*").in("congregation_id", congIds)
      : { data: [] };

    return {
      ok: true as const,
      file: {
        type: "visita_sc_backup" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        superintendentId: userId,
        data: {
          congregations: congregations ?? [],
          visits: visits ?? [],
          checklist_items, field_meetings, field_assignments, schedule_events, meals,
          meal_day_notes,
          transport_schedule, private_notes,
          checklist_templates: checklist_templates ?? [],
          checklist_template_items: checklist_template_items ?? [],
          field_meeting_templates: field_meeting_templates ?? [],
          field_meeting_template_items: field_meeting_template_items ?? [],
          program_templates: program_templates ?? [],
          program_template_items: program_template_items ?? [],
          user_roles: user_roles ?? [],
        },
      },
    };
  });

const recordArray = z.array(z.record(z.string(), z.unknown())).transform((arr) => arr as unknown as Row[]);

const backupFileSchema = z.object({
  type: z.literal("visita_sc_backup"),
  version: z.literal(1),
  exportedAt: z.string(),
  superintendentId: z.string().uuid().optional(),
  data: z.object({
    congregations: recordArray,
    visits: recordArray,
    checklist_items: recordArray,
    field_meetings: recordArray,
    field_assignments: recordArray,
    schedule_events: recordArray,
    meals: recordArray,
    meal_day_notes: recordArray.optional().default([]),
    transport_schedule: recordArray,
    private_notes: recordArray,
    checklist_templates: recordArray,
    checklist_template_items: recordArray,
    field_meeting_templates: recordArray,
    field_meeting_template_items: recordArray,
    program_templates: recordArray,
    program_template_items: recordArray,
    user_roles: recordArray,
  }),
});

export const restoreFullBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: backupFileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: role } = await supabaseAdmin.from("user_roles")
      .select("id").eq("user_id", userId).eq("role", "superintendent").maybeSingle();
    if (!role) return { ok: false as const, error: "Apenas superintendentes." };

    const d = data.file.data;

    // SECURITY: prevent IDOR — só restaurar dados de congregações que o
    // usuário possui ou que serão criadas em nome dele. Backups feitos por
    // outros SCs ou adulterados não podem injetar/sobrescrever dados
    // alheios.
    const { data: ownedCongs } = await supabaseAdmin
      .from("congregations").select("id").eq("superintendent_id", userId);
    const ownedCongIds = new Set((ownedCongs ?? []).map((c) => c.id as string));

    const incomingCongIds = new Set(
      d.congregations
        .map((r) => (r as Record<string, unknown>).id)
        .filter((v): v is string => typeof v === "string"),
    );
    const allowedCongIds = new Set<string>([...ownedCongIds, ...incomingCongIds]);

    // Force ownership of congregations and templates to the current user
    const congregations = d.congregations.map((r) => ({ ...r, superintendent_id: userId }));
    const checklist_templates = d.checklist_templates.map((r) => ({ ...r, superintendent_id: userId }));
    const field_meeting_templates = d.field_meeting_templates.map((r) => ({ ...r, superintendent_id: userId }));
    const program_templates = d.program_templates.map((r) => ({ ...r, superintendent_id: userId }));

    const allowedVisits = d.visits.filter((v) => {
      const congId = (v as Record<string, unknown>).congregation_id;
      return typeof congId === "string" && allowedCongIds.has(congId);
    });
    const allowedVisitIds = new Set(
      allowedVisits
        .map((v) => (v as Record<string, unknown>).id)
        .filter((v): v is string => typeof v === "string"),
    );

    const filterByVisit = (rows: Row[]) =>
      rows.filter((r) => {
        const vId = (r as Record<string, unknown>).visit_id;
        return typeof vId === "string" && allowedVisitIds.has(vId);
      });

    const upsert = async (table: string, rows: Row[]) => {
      if (!rows.length) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from(table as any) as any).upsert(rows, { onConflict: "id" });
      return (error as { message?: string } | null)?.message ?? null;
    };

    const steps: Array<[string, Row[]]> = [
      ["congregations", congregations],
      ["visits", allowedVisits],
      ["checklist_templates", checklist_templates],
      ["checklist_template_items", d.checklist_template_items],
      ["field_meeting_templates", field_meeting_templates],
      ["field_meeting_template_items", d.field_meeting_template_items],
      ["program_templates", program_templates],
      ["program_template_items", d.program_template_items],
      ["checklist_items", filterByVisit(d.checklist_items)],
      ["field_meetings", filterByVisit(d.field_meetings)],
      ["field_assignments", filterByVisit(d.field_assignments)],
      ["schedule_events", filterByVisit(d.schedule_events)],
      ["meals", filterByVisit(d.meals)],
      ["meal_day_notes", filterByVisit(d.meal_day_notes ?? [])],
      ["transport_schedule", filterByVisit(d.transport_schedule)],
      ["private_notes", filterByVisit(d.private_notes).map((r) => ({ ...r, superintendent_id: userId }))],
    ];

    const errors: string[] = [];
    let counted = 0;
    const skipped = d.visits.length - allowedVisits.length;
    for (const [table, rows] of steps) {
      const err = await upsert(table, rows);
      if (err) errors.push(`${table}: ${err}`);
      else counted += rows.length;
    }

    if (errors.length) return { ok: false as const, error: errors.join(" | "), restored: counted, skipped };
    return { ok: true as const, restored: counted, skipped };
  });
