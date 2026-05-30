import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}\*?$/);

export const getGuestSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: codeSchema }).parse(input))
  .handler(async ({ data }) => {
    const wifeMode = data.inviteCode.endsWith("*");
    const cleanCode = wifeMode ? data.inviteCode.slice(0, -1) : data.inviteCode;

    const { data: cong } = await supabaseAdmin
      .from("congregations")
      .select("id,name,is_active,superintendent_id")
      .eq("invite_code", cleanCode)
      .maybeSingle();
    if (!cong) return { ok: false as const, error: "Código inválido." };

    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id,title,start_date,end_date,is_active,meeting_talk_template_id,field_meeting_template_id,template_id")
      .eq("congregation_id", cong.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);
    const visit = visits?.[0] ?? null;

    // Circuit-level events visible to this congregation (independent of any visit).
    // The "visible_to_spouse" flag hides events ONLY from the spouse panel (wifeMode);
    // elder/ESC guest access always sees the events targeted to their congregation.
    const todayIso = new Date().toISOString().slice(0, 10);
    let circuitQuery = supabaseAdmin
      .from("circuit_schedule_events")
      .select("id,event_date,start_time,end_time,title,location,event_type,notes,scope,congregation_ids,visible_to_spouse,superintendent_id,status")
      .neq("scope", "personal")
      .neq("status", "completed")
      .gte("event_date", todayIso)
      .order("event_date")
      .order("start_time");
    if (wifeMode) circuitQuery = circuitQuery.eq("visible_to_spouse", true);
    const { data: circuitRaw } = await circuitQuery;

    const circuitFiltered = (circuitRaw ?? []).filter((e) => {
      if (e.scope === "all") return e.superintendent_id === cong.superintendent_id;
      return Array.isArray(e.congregation_ids) && e.congregation_ids.includes(cong.id);
    });
    const circuitAsSchedule = circuitFiltered.map((e) => ({
      id: `cse_${e.id}`,
      event_date: e.event_date,
      start_time: e.start_time,
      end_time: e.end_time,
      title: e.title,
      location: e.location,
      type: e.event_type,
      notes: e.notes,
    }));

    if (!visit) {
      return { ok: true as const, wifeMode, congregation: cong, visit: null, schedule: circuitAsSchedule, meals: [], mealDayNotes: [], field: [], fieldMeetings: [], transport: [], checklist: [], midweek: [], weekend: [], pioneer: [], elders: [], templateExtras: { field: null, midweek: null, weekend: null, pioneer: null, elders: null, program: null } };
    }

    const [{ data: schedule }, { data: meals }, { data: mealDayNotes }, { data: field }, { data: fieldMeetings }, { data: transport }, checklistRes, { data: midweek }, { data: weekend }, { data: pioneer }, { data: elders }] = await Promise.all([
      supabaseAdmin.from("schedule_events").select("id,event_date,start_time,end_time,title,location,type,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date").order("start_time"),
      supabaseAdmin.from("meals").select("id,meal_date,type,host_name,location,meal_time,contact_phone,notes").eq("visit_id", visit.id).eq("is_active", true).order("meal_date"),
      supabaseAdmin.from("meal_day_notes").select("meal_date,notes").eq("visit_id", visit.id),
      supabaseAdmin.from("field_assignments").select("id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
      supabaseAdmin.from("field_meetings").select("id,event_date,period,modality,meeting_time,territory_number,territory_location,auxiliary_leaders,closing_prayer").eq("visit_id", visit.id).eq("is_active", true).order("event_date").order("period"),
      supabaseAdmin.from("transport_schedule").select("id,event_date,driver_name,contact_phone,description,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
      wifeMode
        ? Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string | null; status: string; link_or_notes: string | null; info_text: string | null }> })
        : supabaseAdmin.from("checklist_items").select("id,title,status,description,link_or_notes,info_text").eq("visit_id", visit.id).order("sort_order").order("created_at"),
      supabaseAdmin.from("midweek_meetings").select("id,chairman,service_talk_theme,closing_prayer").eq("visit_id", visit.id),
      supabaseAdmin.from("weekend_meetings").select("id,meeting_at,public_talk_theme,talk_theme_title").eq("visit_id", visit.id).order("meeting_at"),
      supabaseAdmin.from("pioneer_meetings").select("id,meeting_at,super_meeting_at,location,theme,opening_prayer,closing_prayer").eq("visit_id", visit.id).order("meeting_at"),
      wifeMode
        ? Promise.resolve({ data: [] as Array<{ id: string; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }> })
        : supabaseAdmin.from("elders_servants_meetings").select("id,theme,opening_prayer,closing_prayer").eq("visit_id", visit.id),
    ]);

    const mergedSchedule = [...(schedule ?? []), ...circuitAsSchedule].sort((a, b) => {
      const d = a.event_date.localeCompare(b.event_date);
      if (d !== 0) return d;
      return (a.start_time ?? "").localeCompare(b.start_time ?? "");
    });

    // Load read-only "from template" extras (observations + weekend songs +
    // program general observations). Elders' observations are hidden in
    // wifeMode (spouse panel).
    const [
      { data: fmTpl },
      { data: mtRoot },
      { data: mtMid },
      { data: mtPio },
      { data: mtEld },
      { data: progTpl },
    ] = await Promise.all([
      visit.field_meeting_template_id
        ? supabaseAdmin.from("field_meeting_templates").select("observations").eq("id", visit.field_meeting_template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      visit.meeting_talk_template_id
        ? supabaseAdmin.from("meeting_talk_templates").select("weekend_opening_song,weekend_closing_song,weekend_observations").eq("id", visit.meeting_talk_template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      visit.meeting_talk_template_id
        ? supabaseAdmin.from("meeting_talk_template_midweek").select("observations").eq("template_id", visit.meeting_talk_template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      visit.meeting_talk_template_id
        ? supabaseAdmin.from("meeting_talk_template_pioneer").select("observations").eq("template_id", visit.meeting_talk_template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      visit.meeting_talk_template_id && !wifeMode
        ? supabaseAdmin.from("meeting_talk_template_elders").select("observations").eq("template_id", visit.meeting_talk_template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      visit.template_id
        ? supabaseAdmin.from("program_templates").select("general_observations").eq("id", visit.template_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const templateExtras = {
      field: fmTpl ? { observations: (fmTpl as { observations: string | null }).observations ?? null } : null,
      midweek: mtMid ? { observations: (mtMid as { observations: string | null }).observations ?? null } : null,
      weekend: mtRoot
        ? {
            opening_song: (mtRoot as { weekend_opening_song: string | null }).weekend_opening_song ?? null,
            closing_song: (mtRoot as { weekend_closing_song: string | null }).weekend_closing_song ?? null,
            observations: (mtRoot as { weekend_observations: string | null }).weekend_observations ?? null,
          }
        : null,
      pioneer: mtPio ? { observations: (mtPio as { observations: string | null }).observations ?? null } : null,
      elders: mtEld ? { observations: (mtEld as { observations: string | null }).observations ?? null } : null,
      program: progTpl ? { general_observations: (progTpl as { general_observations: string | null }).general_observations ?? null } : null,
    };

    const payload = {
      ok: true as const,
      wifeMode,
      congregation: cong,
      visit,
      schedule: mergedSchedule,
      meals: meals ?? [],
      mealDayNotes: mealDayNotes ?? [],
      field: field ?? [],
      fieldMeetings: fieldMeetings ?? [],
      transport: transport ?? [],
      checklist: checklistRes.data ?? [],
      midweek: midweek ?? [],
      weekend: weekend ?? [],
      pioneer: pioneer ?? [],
      elders: elders ?? [],
      templateExtras,
    };
    return JSON.parse(JSON.stringify(payload)) as typeof payload;
  });
