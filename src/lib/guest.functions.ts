import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/);

export const getGuestSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: codeSchema }).parse(input))
  .handler(async ({ data }) => {
    const { data: cong } = await supabaseAdmin
      .from("congregations")
      .select("id,name,is_active")
      .eq("invite_code", data.inviteCode)
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
      return { ok: true as const, congregation: cong, visit: null, schedule: [], meals: [], field: [], transport: [] };
    }

    const [{ data: schedule }, { data: meals }, { data: field }, { data: transport }] = await Promise.all([
      supabaseAdmin.from("schedule_events").select("id,event_date,start_time,end_time,title,location,type,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date").order("start_time"),
      supabaseAdmin.from("meals").select("id,meal_date,type,host_name,location,meal_time,contact_phone,notes").eq("visit_id", visit.id).eq("is_active", true).order("meal_date"),
      supabaseAdmin.from("field_assignments").select("id,event_date,period,meeting_point,meeting_time,acompanhante,acompanhante_for,contact_phone").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
      supabaseAdmin.from("transport_schedule").select("id,event_date,driver_name,contact_phone,description,notes").eq("visit_id", visit.id).eq("is_active", true).order("event_date"),
    ]);

    return {
      ok: true as const,
      congregation: cong,
      visit,
      schedule: schedule ?? [],
      meals: meals ?? [],
      field: field ?? [],
      transport: transport ?? [],
    };
  });
