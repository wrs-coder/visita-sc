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
      .select("id,name,is_active")
      .eq("invite_code", cleanCode)
      .maybeSingle();
    if (!cong) return { ok: false as const, error: "Código inválido." };

    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id,title,start_date,end_date,is_active")
      .eq("congregation_id", cong.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);
    const visit = visits?.[0] ?? null;
    if (!visit) {
      return { ok: true as const, wifeMode, congregation: cong, visit: null, schedule: [], meals: [], mealDayNotes: [], field: [], fieldMeetings: [], transport: [], checklist: [] };
    }

    const [{ data: schedule }, { data: meals }, { data: mealDayNotes }, { data: field }, { data: fieldMeetings }, { data: transport }, checklistRes] = await Promise.all([
      supabaseAdmin.from("schedule_events").select("id,event_date,start_time,end_time,title,location,type,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date").order("start_time"),
      supabaseAdmin.from("meals").select("id,meal_date,type,host_name,location,meal_time,contact_phone,notes").eq("visit_id", visit.id).eq("is_active", true).order("meal_date"),
      supabaseAdmin.from("meal_day_notes").select("meal_date,notes").eq("visit_id", visit.id),
      supabaseAdmin.from("field_assignments").select("id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
      supabaseAdmin.from("field_meetings").select("id,event_date,period,modality,meeting_time,territory_number,territory_location,auxiliary_leaders,closing_prayer").eq("visit_id", visit.id).eq("is_active", true).order("event_date").order("period"),
      supabaseAdmin.from("transport_schedule").select("id,event_date,driver_name,contact_phone,description,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
      wifeMode
        ? Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string | null; status: string; link_or_notes: string | null; info_text: string | null }> })
        : supabaseAdmin.from("checklist_items").select("id,title,status,description,link_or_notes,info_text").eq("visit_id", visit.id).order("sort_order").order("created_at"),
    ]);

    return {
      ok: true as const,
      wifeMode,
      congregation: cong,
      visit,
      schedule: schedule ?? [],
      meals: meals ?? [],
      mealDayNotes: mealDayNotes ?? [],
      field: field ?? [],
      fieldMeetings: fieldMeetings ?? [],
      transport: transport ?? [],
      checklist: checklistRes.data ?? [],
    };
  });
