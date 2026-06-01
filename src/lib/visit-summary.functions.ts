// Server fn que retorna o snapshot do "Resumo da Semana" para o
// Superintendente autenticado, usando o MESMO shape do guest snapshot
// (apenas leitura — RLS já permite o super ler tudo da própria
// congregação via policies existentes).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  congregationId: z.string().uuid(),
});

export const getSuperVisitSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica que o caller é superintendente desta congregação.
    const { data: cong, error: congErr } = await supabase
      .from("congregations")
      .select("id,name,is_active,superintendent_id")
      .eq("id", data.congregationId)
      .maybeSingle();
    if (congErr || !cong) {
      return { ok: false as const, error: "Congregação não encontrada." };
    }
    if (cong.superintendent_id !== userId) {
      return { ok: false as const, error: "Acesso negado." };
    }

    const { data: visits } = await supabase
      .from("visits")
      .select("id,title,start_date,end_date,is_active")
      .eq("congregation_id", cong.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);
    const visit = visits?.[0] ?? null;

    // Eventos do circuito visíveis para esta congregação.
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: circuitRaw } = await supabase
      .from("circuit_schedule_events")
      .select(
        "id,event_date,start_time,end_time,title,location,event_type,notes,scope,congregation_ids,visible_to_spouse,superintendent_id,status",
      )
      .neq("scope", "personal")
      .neq("status", "completed")
      .gte("event_date", todayIso)
      .order("event_date")
      .order("start_time");

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
      return {
        ok: true as const,
        wifeMode: false,
        congregation: { id: cong.id, name: cong.name },
        visit: null,
        schedule: circuitAsSchedule,
        meals: [],
        mealDayNotes: [],
        field: [],
        fieldMeetings: [],
        transport: [],
        checklist: [],
        midweek: [],
        weekend: [],
        pioneer: [],
        elders: [],
      };
    }

    const [
      { data: schedule },
      { data: meals },
      { data: mealDayNotes },
      { data: field },
      { data: fieldMeetings },
      { data: transport },
      { data: checklist },
      { data: midweek },
      { data: weekend },
      { data: pioneer },
      { data: elders },
    ] = await Promise.all([
      supabase
        .from("schedule_events")
        .select("id,event_date,start_time,end_time,title,location,type,notes")
        .eq("visit_id", visit.id)
        .eq("is_active", true)
        .order("event_date")
        .order("start_time"),
      supabase
        .from("meals")
        .select("id,meal_date,type,host_name,location,meal_time,contact_phone,notes")
        .eq("visit_id", visit.id)
        .eq("is_active", true)
        .order("meal_date"),
      supabase.from("meal_day_notes").select("meal_date,notes").eq("visit_id", visit.id),
      supabase
        .from("field_assignments")
        .select("id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone")
        .eq("visit_id", visit.id)
        .eq("is_active", true)
        .order("event_date"),
      supabase
        .from("field_meetings")
        .select("id,event_date,period,modality,meeting_time,territory_number,territory_location,auxiliary_leaders,closing_prayer")
        .eq("visit_id", visit.id)
        .eq("is_active", true)
        .order("event_date")
        .order("period"),
      supabase
        .from("transport_schedule")
        .select("id,event_date,weekday,event_type,direction,all_day,departure_time,return_time,driver_name,contact_phone,description,notes")
        .eq("visit_id", visit.id)
        .eq("is_active", true)
        .order("event_date"),
      supabase
        .from("checklist_items")
        .select("id,title,status,description,link_or_notes,info_text")
        .eq("visit_id", visit.id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("midweek_meetings")
        .select("id,chairman,service_talk_theme,closing_prayer")
        .eq("visit_id", visit.id),
      supabase
        .from("weekend_meetings")
        .select("id,meeting_at,public_talk_theme,talk_theme_title")
        .eq("visit_id", visit.id)
        .order("meeting_at"),
      supabase
        .from("pioneer_meetings")
        .select("id,meeting_at,super_meeting_at,location,theme,opening_prayer,closing_prayer")
        .eq("visit_id", visit.id)
        .order("meeting_at"),
      supabase
        .from("elders_servants_meetings")
        .select("id,theme,opening_prayer,closing_prayer")
        .eq("visit_id", visit.id),
    ]);

    const mergedSchedule = [...(schedule ?? []), ...circuitAsSchedule].sort((a, b) => {
      const d = a.event_date.localeCompare(b.event_date);
      if (d !== 0) return d;
      return (a.start_time ?? "").localeCompare(b.start_time ?? "");
    });

    const payload = {
      ok: true as const,
      wifeMode: false,
      congregation: { id: cong.id, name: cong.name },
      visit,
      schedule: mergedSchedule,
      meals: meals ?? [],
      mealDayNotes: mealDayNotes ?? [],
      field: field ?? [],
      fieldMeetings: fieldMeetings ?? [],
      transport: transport ?? [],
      checklist: checklist ?? [],
      midweek: midweek ?? [],
      weekend: weekend ?? [],
      pioneer: pioneer ?? [],
      elders: elders ?? [],
    };
    return JSON.parse(JSON.stringify(payload)) as typeof payload;
  });
