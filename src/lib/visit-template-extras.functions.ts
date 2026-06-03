import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EMPTY_VISIT_TEMPLATE_EXTRAS,
  type VisitTemplateExtras,
} from "./visit-template-extras.shared";

export type { VisitTemplateExtras } from "./visit-template-extras.shared";

/**
 * Returns read-only "from template" extras for the visit's linked templates.
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

    const extras: VisitTemplateExtras = { ...EMPTY_VISIT_TEMPLATE_EXTRAS };

    if (visit.field_meeting_template_id) {
      const { data: fm } = await supabaseAdmin
        .from("field_meeting_templates")
        .select("observations")
        .eq("id", visit.field_meeting_template_id)
        .maybeSingle();
      extras.field = { observations: (fm?.observations as string | null) ?? null };
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
      extras.weekend = {
        opening_song: root?.weekend_opening_song ?? null,
        closing_song: root?.weekend_closing_song ?? null,
        observations: root?.weekend_observations ?? null,
      };
      extras.midweek = { observations: mid?.observations ?? null, final_song: (mid as { final_song?: string | null } | null)?.final_song ?? null };
      extras.pioneer = { observations: pio?.observations ?? null, weekday: (pio as { weekday?: number | null } | null)?.weekday ?? null, meeting_time: (pio as { meeting_time?: string | null } | null)?.meeting_time ?? null };
      extras.elders = { observations: eld?.observations ?? null, weekday: (eld as { weekday?: number | null } | null)?.weekday ?? null, meeting_time: (eld as { meeting_time?: string | null } | null)?.meeting_time ?? null };
    }

    if (visit.template_id) {
      const { data: pt } = await supabaseAdmin
        .from("program_templates")
        .select("general_observations")
        .eq("id", visit.template_id)
        .maybeSingle();
      extras.program = { general_observations: (pt?.general_observations as string | null) ?? null };
    }

    return { ok: true as const, extras };
  });
