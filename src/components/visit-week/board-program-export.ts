// Junta os dados da visita (e da reunião do controle de tempo) e gera o PDF do quadro de anúncios.
import { supabase } from "@/integrations/supabase/client";
import { getVisitTemplateExtras } from "@/lib/visit-template-extras.functions";
import { loadPrograms } from "@/lib/meeting/meeting-store";
import { applyVisitWeek } from "@/lib/meeting/visit-week-meeting";
import { buildBoardModel, renderBoardPdf } from "@/lib/visit-week/board-program";
import { saveBlob } from "@/lib/share";

type R = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function exportBoardProgram(visitId: string, userId: string): Promise<void> {
  const { data: v } = await supabase.from("visits").select("id,start_date,end_date,congregation_id").eq("id", visitId).maybeSingle();
  if (!v) throw new Error("Visita não encontrada.");
  const [cg, pr, mw, we, pi, el, fm, ex] = await Promise.all([
    supabase.from("congregations").select("name").eq("id", v.congregation_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("midweek_meetings").select("meeting_at,chairman,service_talk_theme").eq("visit_id", visitId).maybeSingle(),
    supabase.from("weekend_meetings").select("meeting_at,public_talk_theme,talk_theme_title").eq("visit_id", visitId).maybeSingle(),
    supabase.from("pioneer_meetings").select("meeting_at,super_meeting_at,location").eq("visit_id", visitId).maybeSingle(),
    supabase.from("elders_servants_meetings").select("meeting_at,location").eq("visit_id", visitId).maybeSingle(),
    supabase.from("field_meetings").select("event_date,period,meeting_time,meeting_location").eq("visit_id", visitId).eq("is_active", true),
    getVisitTemplateExtras({ data: { visitId } }).catch(() => null),
  ]);
  const extras = ex && (ex as { ok?: boolean }).ok ? (ex as { extras: { midweek: R | null; weekend: R | null } }).extras : null;
  const sc = str((pr.data as R | null)?.full_name) ?? "";
  const finalSong = str(extras?.midweek?.final_song);
  const serviceTalk = str((mw.data as R | null)?.service_talk_theme);
  const prog = loadPrograms(userId).find((p) => p.date >= v.start_date && p.date <= v.end_date) ?? null;
  const parts = prog ? applyVisitWeek(prog, { serviceTalk, finalSong, scName: sc }).program.parts : null;
  const midAt = str((mw.data as R | null)?.meeting_at) ?? (prog ? `${prog.date}T${prog.start}:00` : null);
  const model = buildBoardModel({
    startDate: v.start_date, endDate: v.end_date, sc, congregation: str((cg.data as R | null)?.name) ?? "",
    midweek: { at: midAt, chairman: str((mw.data as R | null)?.chairman), parts, serviceTalk, finalSong },
    weekend: {
      at: str((we.data as R | null)?.meeting_at), publicTalk: str((we.data as R | null)?.public_talk_theme), finalTalk: str((we.data as R | null)?.talk_theme_title),
      openingSong: str(extras?.weekend?.opening_song), closingSong: str(extras?.weekend?.closing_song),
    },
    pioneer: pi.data ? { at: str((pi.data as R).super_meeting_at) ?? str((pi.data as R).meeting_at), place: str((pi.data as R).location) } : null,
    elders: el.data ? { at: str((el.data as R).meeting_at), place: str((el.data as R).location) } : null,
    field: ((fm.data ?? []) as R[]).map((f) => ({ date: String(f.event_date ?? ""), period: String(f.period ?? ""), time: str(f.meeting_time), place: str(f.meeting_location) })),
  });
  const blob = await renderBoardPdf(model);
  await saveBlob(blob, { filename: `quadro-semana-da-visita-${v.start_date}.pdf`, mimeType: "application/pdf" });
}
