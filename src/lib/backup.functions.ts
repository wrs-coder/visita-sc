import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// JSON-serializable row shape used for transport across the server-fn boundary.
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Row = { [k: string]: Json };

// Tabelas escopadas por visit_id
const VISIT_TABLES = [
  "checklist_items",
  "field_meetings",
  "field_assignments",
  "schedule_events",
  "meals",
  "meal_day_notes",
  "transport_schedule",
  "private_notes",
  "midweek_meetings",
  "weekend_meetings",
  "pioneer_meetings",
  "elders_servants_meetings",
  "elder_encouragements",
  "elder_local_matters",
  "elder_pastoral_visits",
  "elder_recommendations",
  "elder_program_visit_sections",
  "elder_program_visit_slots",
  "visit_pending_updates",
  "visit_template_overrides",
] as const;

// Tabelas escopadas por superintendent_id (modelos / dados pessoais)
const SUPT_TABLES = [
  "circuit_schedule_events",
  "couple_messages",
  "talk_themes",
] as const;

// Modelos com filhos por template_id
const TEMPLATE_FAMILIES: Array<{ parent: string; children: string[] }> = [
  { parent: "checklist_templates", children: ["checklist_template_items"] },
  { parent: "field_meeting_templates", children: ["field_meeting_template_items"] },
  { parent: "program_templates", children: ["program_template_items"] },
  {
    parent: "meeting_talk_templates",
    children: [
      "meeting_talk_template_elders",
      "meeting_talk_template_midweek",
      "meeting_talk_template_pioneer",
      "meeting_talk_template_weekend_themes",
    ],
  },
  {
    parent: "elder_program_templates",
    children: [
      "elder_program_template_sections",
      "elder_program_template_slots",
      "elder_program_template_events",
    ],
  },
];

export const exportFullBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

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

    const fetchIn = async (table: string, col: string, ids: string[]) => {
      if (!ids.length) return [] as Row[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabaseAdmin.from(table as any) as any).select("*").in(col, ids);
      return (res.data ?? []) as Row[];
    };
    const fetchByVisit = (t: string) => fetchIn(t, "visit_id", visitIds);
    const fetchBySupt = async (t: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabaseAdmin.from(t as any) as any).select("*").eq("superintendent_id", userId);
      return (res.data ?? []) as Row[];
    };

    // Visit-scoped
    const visitData: Record<string, Row[]> = {};
    await Promise.all(
      VISIT_TABLES.map(async (t) => { visitData[t] = await fetchByVisit(t); }),
    );

    // Esboços pessoais — user_id
    const { data: personal_outlines = [] } = await supabaseAdmin
      .from("personal_outlines").select("*").eq("user_id", userId);

    // Supt-scoped pequenos
    const suptData: Record<string, Row[]> = {};
    await Promise.all(
      SUPT_TABLES.map(async (t) => { suptData[t] = await fetchBySupt(t); }),
    );

    // Famílias de modelos
    const templates: Record<string, Row[]> = {};
    for (const fam of TEMPLATE_FAMILIES) {
      const parentRows = await fetchBySupt(fam.parent);
      templates[fam.parent] = parentRows;
      const parentIds = parentRows.map((r) => r.id as string).filter((v) => typeof v === "string");
      for (const child of fam.children) {
        templates[child] = await fetchIn(child, "template_id", parentIds);
      }
    }

    const { data: user_roles = [] } = congIds.length
      ? await supabaseAdmin.from("user_roles").select("*").in("congregation_id", congIds)
      : { data: [] };

    return {
      ok: true as const,
      file: {
        type: "visita_sc_backup" as const,
        version: 2 as const,
        exportedAt: new Date().toISOString(),
        superintendentId: userId,
        data: {
          congregations: congregations ?? [],
          visits: visits ?? [],
          user_roles: user_roles ?? [],
          personal_outlines: (personal_outlines ?? []) as Row[],
          ...visitData,
          ...suptData,
          ...templates,
        } as Record<string, Row[]>,
      },
    };
  });

const recordArray = z.array(z.record(z.string(), z.unknown())).transform((arr) => arr as unknown as Row[]);
const optArr = recordArray.optional().default([]);

// Aceita v1 (antigo) ou v2 (novo); todos os campos extras são opcionais.
const backupFileSchema = z.object({
  type: z.literal("visita_sc_backup"),
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  superintendentId: z.string().uuid().optional(),
  data: z.object({
    congregations: recordArray,
    visits: recordArray,
    user_roles: optArr,
    // Visit-scoped (v1 + v2)
    checklist_items: optArr,
    field_meetings: optArr,
    field_assignments: optArr,
    schedule_events: optArr,
    meals: optArr,
    meal_day_notes: optArr,
    transport_schedule: optArr,
    private_notes: optArr,
    // Visit-scoped (v2)
    midweek_meetings: optArr,
    weekend_meetings: optArr,
    pioneer_meetings: optArr,
    elders_servants_meetings: optArr,
    elder_encouragements: optArr,
    elder_local_matters: optArr,
    elder_pastoral_visits: optArr,
    elder_recommendations: optArr,
    elder_program_visit_sections: optArr,
    elder_program_visit_slots: optArr,
    visit_pending_updates: optArr,
    visit_template_overrides: optArr,
    // Supt-scoped (v2)
    circuit_schedule_events: optArr,
    couple_messages: optArr,
    talk_themes: optArr,
    personal_outlines: optArr,
    // Templates
    checklist_templates: optArr,
    checklist_template_items: optArr,
    field_meeting_templates: optArr,
    field_meeting_template_items: optArr,
    program_templates: optArr,
    program_template_items: optArr,
    meeting_talk_templates: optArr,
    meeting_talk_template_elders: optArr,
    meeting_talk_template_midweek: optArr,
    meeting_talk_template_pioneer: optArr,
    meeting_talk_template_weekend_themes: optArr,
    elder_program_templates: optArr,
    elder_program_template_sections: optArr,
    elder_program_template_slots: optArr,
    elder_program_template_events: optArr,
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

    // ---- Segurança (mesmas travas da v1) ----
    const { data: ownedCongs } = await supabaseAdmin
      .from("congregations").select("id").eq("superintendent_id", userId);
    const ownedCongIds = new Set((ownedCongs ?? []).map((c) => c.id as string));

    const allowedCongregationRows = d.congregations.filter((r) => {
      const id = (r as Record<string, unknown>).id;
      return typeof id === "string" && ownedCongIds.has(id);
    });
    const skippedCongregations = d.congregations.length - allowedCongregationRows.length;
    const allowedCongIds = ownedCongIds;

    const congregations = allowedCongregationRows.map((r) => ({ ...r, superintendent_id: userId }));

    // Força superintendent_id no usuário atual para todos os modelos e
    // dados pessoais; filhos restauráveis só quando seu parent foi aceito.
    const reownSupt = (rows: Row[]) => rows.map((r) => ({ ...r, superintendent_id: userId }));
    const reownUser = (rows: Row[]) => rows.map((r) => ({ ...r, user_id: userId }));

    const templates: Record<string, Row[]> = {};
    const ownedTplIds: Record<string, Set<string>> = {};
    for (const fam of TEMPLATE_FAMILIES) {
      const parentKey = fam.parent as keyof typeof d;
      const parentRows = reownSupt((d[parentKey] as Row[]) ?? []);
      templates[fam.parent] = parentRows;
      ownedTplIds[fam.parent] = new Set(
        parentRows.map((r) => (r as Record<string, unknown>).id)
          .filter((v): v is string => typeof v === "string"),
      );
    }
    const filterByTemplate = (rows: Row[], owned: Set<string>) =>
      rows.filter((r) => {
        const tid = (r as Record<string, unknown>).template_id;
        return typeof tid === "string" && owned.has(tid);
      });

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
    ];
    // Modelos: parent depois children
    for (const fam of TEMPLATE_FAMILIES) {
      steps.push([fam.parent, templates[fam.parent]]);
      for (const child of fam.children) {
        steps.push([child, filterByTemplate((d[child as keyof typeof d] as Row[]) ?? [], ownedTplIds[fam.parent])]);
      }
    }
    // Supt-scoped pequenos
    for (const t of SUPT_TABLES) {
      steps.push([t, reownSupt((d[t as keyof typeof d] as Row[]) ?? [])]);
    }
    // Esboços pessoais — user_id
    steps.push(["personal_outlines", reownUser(d.personal_outlines ?? [])]);
    // Visit-scoped
    for (const t of VISIT_TABLES) {
      const rows = filterByVisit((d[t as keyof typeof d] as Row[]) ?? []);
      if (t === "private_notes") {
        steps.push([t, rows.map((r) => ({ ...r, superintendent_id: userId }))]);
      } else {
        steps.push([t, rows]);
      }
    }

    const errors: string[] = [];
    let counted = 0;
    const skipped = (d.visits.length - allowedVisits.length) + skippedCongregations;
    for (const [table, rows] of steps) {
      const err = await upsert(table, rows);
      if (err) errors.push(`${table}: ${err}`);
      else counted += rows.length;
    }

    if (errors.length) return { ok: false as const, error: errors.join(" | "), restored: counted, skipped };
    return { ok: true as const, restored: counted, skipped };
  });
