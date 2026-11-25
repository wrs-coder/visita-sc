// Junta os dados da visita (e da reunião do controle de tempo) e gera o PDF do quadro de anúncios.
import { supabase } from "@/integrations/supabase/client";
import { getVisitTemplateExtras } from "@/lib/visit-template-extras.functions";
import { loadPrograms } from "@/lib/meeting/meeting-store";
import { applyVisitWeek } from "@/lib/meeting/visit-week-meeting";
import { boardMissing, buildBoardModel, pickVisitProgram, renderBoardPdf, type BoardContentOptions, type BoardRenderOptions } from "@/lib/visit-week/board-program";
import { withNetworkWindow } from "@/lib/net-policy";
import { saveBlob } from "@/lib/share";
import { resolveWeekdaySlot } from "@/lib/today-timeline";

type R = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function exportBoardProgram(visitId: string, userId: string, opts: BoardRenderOptions & BoardContentOptions = {}): Promise<{ missing: string[] }> {
  // Sempre os dados mais novos (como a Agenda depois de sincronizar); sem internet, usa a cópia do aparelho.
  return withNetworkWindow(() => exportBoardProgramNow(visitId, userId, opts));
}

async function exportBoardProgramNow(visitId: string, userId: string, opts: BoardRenderOptions & BoardContentOptions): Promise<{ missing: string[] }> {
  const { data: v } = await supabase.from("visits").select("id,start_date,end_date,congregation_id").eq("id", visitId).maybeSingle();
  if (!v) throw new Error("Visita não encontrada.");
  const [cg, pr, mw, we, pi, el, fm, ex] = await Promise.all([
    supabase.from("congregations").select("name").eq("id", v.congregation_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("midweek_meetings").select("meeting_at,chairman,closing_prayer,service_talk_theme").eq("visit_id", visitId).maybeSingle(),
    supabase.from("weekend_meetings").select("meeting_at,public_talk_theme,talk_theme_title,chairman").eq("visit_id", visitId).maybeSingle(),
    supabase.from("pioneer_meetings").select("meeting_at,super_meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visitId).maybeSingle(),
    supabase.from("elders_servants_meetings").select("meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visitId).maybeSingle(),
    supabase.from("field_meetings").select("event_date,period,meeting_time,meeting_location,closing_prayer,modality,modality_other,territory_number").eq("visit_id", visitId).eq("is_active", true),
    getVisitTemplateExtras({ data: { visitId } }).catch(() => null),
  ]);
  const extras = ex && (ex as { ok?: boolean }).ok ? (ex as { extras: { midweek: R | null; weekend: R | null; pioneer: R | null; elders: R | null } }).extras : null;
  // Mesmos dias/horários da Agenda do Início ("Dia e Horário definido pelo Superintendente").
  const visitDays: string[] = [];
  for (let d = new Date(`${v.start_date}T00:00:00`); d <= new Date(`${v.end_date}T00:00:00`); d.setDate(d.getDate() + 1)) {
    visitDays.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  const slot = (x: R | null | undefined) => resolveWeekdaySlot(x?.weekday as number | null | undefined, x?.meeting_time as string | null | undefined, visitDays)?.at ?? null;
  const piSlot = slot(extras?.pioneer), elSlot = slot(extras?.elders);
  const sc = str((pr.data as R | null)?.full_name) ?? "";
  const finalSong = str(extras?.midweek?.final_song);
  const serviceTalk = str((mw.data as R | null)?.service_talk_theme);
  // Mesmo programa e mesma troca da semana da visita que o controle de tempo mostra.
  const prog = pickVisitProgram(loadPrograms(userId), v.start_date, v.end_date);
  const view = prog ? applyVisitWeek(prog, { serviceTalk, finalSong, scName: sc, chairman: str((mw.data as R | null)?.chairman), closingPrayer: str((mw.data as R | null)?.closing_prayer) }) : null;
  const parts = view ? view.program.parts : null;
  const midAt = str((mw.data as R | null)?.meeting_at) ?? (prog ? `${prog.date}T${prog.start}:00` : null);
  const model = buildBoardModel({
    startDate: v.start_date, endDate: v.end_date, sc, congregation: str((cg.data as R | null)?.name) ?? "",
    midweek: { at: midAt, chairman: str((mw.data as R | null)?.chairman), parts, serviceTalk, finalSong, start: prog?.start ?? null, visitTalkId: view?.talkId ?? null, reading: prog?.title ?? null },
    weekend: {
      at: str((we.data as R | null)?.meeting_at), chairman: str((we.data as R | null)?.chairman), publicTalk: str((we.data as R | null)?.public_talk_theme), finalTalk: str((we.data as R | null)?.talk_theme_title),
      openingSong: str(extras?.weekend?.opening_song), closingSong: str(extras?.weekend?.closing_song),
    },
    pioneer: pi.data || piSlot ? { at: piSlot ?? str((pi.data as R).super_meeting_at) ?? str((pi.data as R).meeting_at), place: str((pi.data as R | null)?.location), theme: str((pi.data as R | null)?.theme), opening: str((pi.data as R | null)?.opening_prayer), closing: str((pi.data as R | null)?.closing_prayer) } : null,
    elders: el.data || elSlot ? { at: elSlot ?? str((el.data as R | null)?.meeting_at), place: str((el.data as R | null)?.location), theme: str((el.data as R | null)?.theme), opening: str((el.data as R | null)?.opening_prayer), closing: str((el.data as R | null)?.closing_prayer) } : null,
    field: ((fm.data ?? []) as R[]).map((f) => ({ date: String(f.event_date ?? ""), period: String(f.period ?? ""), time: str(f.meeting_time), place: str(f.meeting_location), prayer: str(f.closing_prayer), modality: str(f.modality) === "outro" ? (str(f.modality_other) ?? "Outro") : str(f.modality), territory: str(f.territory_number) })),
  }, opts);
  const blob = await renderBoardPdf(model, opts);
  const kind = opts.template === "simple" ? "simplificado" : "completo";
  await saveBlob(blob, { filename: `quadro-${kind}-semana-da-visita-${v.start_date}.pdf`, mimeType: "application/pdf" });
  return { missing: boardMissing(model, opts.template ?? "full") };
}
