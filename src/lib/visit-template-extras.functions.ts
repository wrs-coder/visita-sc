import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EMPTY_VISIT_TEMPLATE_EXTRAS,
  type VisitTemplateExtras,
} from "./visit-template-extras.shared";

export type { VisitTemplateExtras } from "./visit-template-extras.shared";

const OVERRIDE_COLUMNS = [
  "field_observations",
  "midweek_observations",
  "midweek_final_song",
  "weekend_opening_song",
  "weekend_closing_song",
  "weekend_observations",
  "pioneer_observations",
  "pioneer_weekday",
  "pioneer_meeting_time",
  "elders_observations",
  "elders_weekday",
  "elders_meeting_time",
  "program_general_observations",
] as const;

type OverrideRow = {
  field_observations?: string | null;
  midweek_observations?: string | null;
  midweek_final_song?: string | null;
  weekend_opening_song?: string | null;
  weekend_closing_song?: string | null;
  weekend_observations?: string | null;
  pioneer_observations?: string | null;
  pioneer_weekday?: number | null;
  pioneer_meeting_time?: string | null;
  elders_observations?: string | null;
  elders_weekday?: number | null;
  elders_meeting_time?: string | null;
  program_general_observations?: string | null;
};

function pick<T>(override: T | null | undefined, fallback: T | null | undefined): T | null {
  if (override !== null && override !== undefined && override !== "") return override as T;
  return (fallback ?? null) as T | null;
}

/**
 * Returns extras for the visit's linked templates merged with per-visit overrides
 * (overrides win when not null). The shape stays identical, so all read-only
 * consumers (visit-summary, guest snapshot, dashboard) keep working unchanged.
 * Authorized for: the visit's superintendent OR a member of the visit's congregation.
 */
export const getVisitTemplateExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits")
      .select("id,congregation_id,meeting_talk_template_id,field_meeting_template_id,template_id")
      .eq("id", data.visitId)
      .maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada.", extras: EMPTY_VISIT_TEMPLATE_EXTRAS };

    const [{ data: cong }, { data: prof }] = await Promise.all([
      supabaseAdmin.from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("congregation_id").eq("id", userId).maybeSingle(),
    ]);
    const allowed =
      (cong && cong.superintendent_id === userId) ||
      (prof && prof.congregation_id === visit.congregation_id);
    if (!allowed) return { ok: false as const, error: "Não autorizado.", extras: EMPTY_VISIT_TEMPLATE_EXTRAS };

    const base: VisitTemplateExtras = { ...EMPTY_VISIT_TEMPLATE_EXTRAS };

    if (visit.field_meeting_template_id) {
      const { data: fm } = await supabaseAdmin
        .from("field_meeting_templates")
        .select("observations")
        .eq("id", visit.field_meeting_template_id)
        .maybeSingle();
      base.field = { observations: (fm?.observations as string | null) ?? null };
    }

    if (visit.meeting_talk_template_id) {
      const tplId = visit.meeting_talk_template_id;
      const [{ data: root }, { data: mid }, { data: pio }, { data: eld }] = await Promise.all([
        supabaseAdmin
          .from("meeting_talk_templates")
          .select("weekend_opening_song,weekend_closing_song,weekend_observations")
          .eq("id", tplId).maybeSingle(),
        supabaseAdmin.from("meeting_talk_template_midweek").select("observations,final_song").eq("template_id", tplId).maybeSingle(),
        supabaseAdmin.from("meeting_talk_template_pioneer").select("observations,weekday,meeting_time").eq("template_id", tplId).maybeSingle(),
        supabaseAdmin.from("meeting_talk_template_elders").select("observations,weekday,meeting_time").eq("template_id", tplId).maybeSingle(),
      ]);
      base.weekend = {
        opening_song: root?.weekend_opening_song ?? null,
        closing_song: root?.weekend_closing_song ?? null,
        observations: root?.weekend_observations ?? null,
      };
      base.midweek = { observations: mid?.observations ?? null, final_song: (mid as { final_song?: string | null } | null)?.final_song ?? null };
      base.pioneer = { observations: pio?.observations ?? null, weekday: (pio as { weekday?: number | null } | null)?.weekday ?? null, meeting_time: (pio as { meeting_time?: string | null } | null)?.meeting_time ?? null };
      base.elders = { observations: eld?.observations ?? null, weekday: (eld as { weekday?: number | null } | null)?.weekday ?? null, meeting_time: (eld as { meeting_time?: string | null } | null)?.meeting_time ?? null };
    }

    if (visit.template_id) {
      const { data: pt } = await supabaseAdmin
        .from("program_templates")
        .select("general_observations")
        .eq("id", visit.template_id)
        .maybeSingle();
      base.program = { general_observations: (pt?.general_observations as string | null) ?? null };
    }

    // Merge per-visit overrides on top of template values.
    const { data: ov } = await supabaseAdmin
      .from("visit_template_overrides")
      .select("*")
      .eq("visit_id", data.visitId)
      .maybeSingle();

    const o = (ov ?? {}) as Record<string, string | number | null>;
    const extras: VisitTemplateExtras = {
      field: { observations: pick(o.field_observations as string | null, base.field?.observations ?? null) },
      midweek: {
        observations: pick(o.midweek_observations as string | null, base.midweek?.observations ?? null),
        final_song: pick(o.midweek_final_song as string | null, base.midweek?.final_song ?? null),
      },
      weekend: {
        opening_song: pick(o.weekend_opening_song as string | null, base.weekend?.opening_song ?? null),
        closing_song: pick(o.weekend_closing_song as string | null, base.weekend?.closing_song ?? null),
        observations: pick(o.weekend_observations as string | null, base.weekend?.observations ?? null),
      },
      pioneer: {
        observations: pick(o.pioneer_observations as string | null, base.pioneer?.observations ?? null),
        weekday: (o.pioneer_weekday as number | null | undefined) ?? base.pioneer?.weekday ?? null,
        meeting_time: pick(o.pioneer_meeting_time as string | null, base.pioneer?.meeting_time ?? null),
      },
      elders: {
        observations: pick(o.elders_observations as string | null, base.elders?.observations ?? null),
        weekday: (o.elders_weekday as number | null | undefined) ?? base.elders?.weekday ?? null,
        meeting_time: pick(o.elders_meeting_time as string | null, base.elders?.meeting_time ?? null),
      },
      program: { general_observations: pick(o.program_general_observations as string | null, base.program?.general_observations ?? null) },
    };

    return { ok: true as const, extras };
  });

const patchSchema = z.object({
  field_observations: z.string().nullable().optional(),
  midweek_observations: z.string().nullable().optional(),
  midweek_final_song: z.string().nullable().optional(),
  weekend_opening_song: z.string().nullable().optional(),
  weekend_closing_song: z.string().nullable().optional(),
  weekend_observations: z.string().nullable().optional(),
  pioneer_observations: z.string().nullable().optional(),
  pioneer_weekday: z.number().int().min(0).max(6).nullable().optional(),
  pioneer_meeting_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  elders_observations: z.string().nullable().optional(),
  elders_weekday: z.number().int().min(0).max(6).nullable().optional(),
  elders_meeting_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  program_general_observations: z.string().nullable().optional(),
});

/**
 * Upsert per-visit overrides. Only the visit's superintendent is authorized.
 * Empty strings are normalized to null (restore template value).
 */
export const setVisitTemplateOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), patch: patchSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits").select("id,congregation_id").eq("id", data.visitId).maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) {
      return { ok: false as const, error: "Não autorizado." };
    }

    const cleaned: OverrideRow = {};
    for (const k of OVERRIDE_COLUMNS) {
      if (!(k in data.patch)) continue;
      const v = (data.patch as Record<string, unknown>)[k];
      if (v === "" || v === undefined) cleaned[k] = null;
      else cleaned[k] = v as string | number | null;
    }

    const { error } = await supabaseAdmin
      .from("visit_template_overrides")
      .upsert({ visit_id: data.visitId, ...cleaned }, { onConflict: "visit_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
