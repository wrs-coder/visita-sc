import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PayloadValue = string | number | boolean | null;
type Payload = Record<string, PayloadValue>;

const payloadSchema: z.ZodType<Payload> = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const itemSchema = z.object({
  kind: z.enum(["study", "meal", "transport"]),
  day_offset: z.number().int().min(0).max(30),
  payload: payloadSchema,
  sort_order: z.number().int().min(0).max(1000).default(0),
});

export const listTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: tpls } = await supabaseAdmin
      .from("program_templates").select("id,slot,name,meal_day_notes,general_observations,created_at,updated_at")
      .eq("superintendent_id", userId).order("slot");
    const ids = (tpls ?? []).map((t) => t.id);
    let items: Array<{ id: string; template_id: string; kind: string; day_offset: number; payload: Payload; sort_order: number }> = [];
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("program_template_items").select("*").in("template_id", ids).order("sort_order");
      items = (data ?? []) as typeof items;
    }
    return { ok: true as const, templates: tpls ?? [], items };
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      slot: z.number().int().min(1).max(10),
      name: z.string().trim().min(1).max(120),
      meal_day_notes: z.record(z.string(), z.string().max(2000)).optional(),
      general_observations: z.string().max(4000).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const updatePatch: { name: string; meal_day_notes?: Record<string, string>; general_observations?: string | null } = { name: data.name };
    if (data.meal_day_notes) updatePatch.meal_day_notes = data.meal_day_notes;
    if (data.general_observations !== undefined) updatePatch.general_observations = data.general_observations;
    const { data: existing } = await supabaseAdmin.from("program_templates")
      .select("id").eq("superintendent_id", userId).eq("slot", data.slot).maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("program_templates").update(updatePatch).eq("id", existing.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: existing.id };
    }
    const insertRow: { superintendent_id: string; slot: number; name: string; meal_day_notes: Record<string, string>; general_observations?: string | null } = {
      superintendent_id: userId,
      slot: data.slot,
      name: data.name,
      meal_day_notes: data.meal_day_notes ?? {},
    };
    if (data.general_observations !== undefined) insertRow.general_observations = data.general_observations;
    const { data: row, error } = await supabaseAdmin.from("program_templates")
      .insert(insertRow).select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha" };
    return { ok: true as const, id: row.id };
  });

export const replaceTemplateItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      templateId: z.string().uuid(),
      items: z.array(itemSchema),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: t } = await supabaseAdmin.from("program_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!t) return { ok: false as const, error: "Modelo não encontrado." };
    await supabaseAdmin.from("program_template_items").delete().eq("template_id", data.templateId);
    if (data.items.length) {
      const rows = data.items.map((it, i) => ({
        template_id: data.templateId,
        kind: it.kind,
        day_offset: it.day_offset,
        payload: it.payload as Record<string, string | number | boolean | null>,
        sort_order: it.sort_order ?? i,
      }));
      const { error } = await supabaseAdmin.from("program_template_items").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const applyTemplateToVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), templateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits")
      .select("id, start_date, congregation_id")
      .eq("id", data.visitId)
      .maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { data: tpl } = await supabaseAdmin
      .from("program_templates").select("id,meal_day_notes").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!tpl) return { ok: false as const, error: "Modelo não encontrado." };

    await supabaseAdmin.from("visits").update({ template_id: data.templateId }).eq("id", data.visitId);

    const { data: items } = await supabaseAdmin
      .from("program_template_items").select("*").eq("template_id", data.templateId).order("sort_order");

    const start = new Date(visit.start_date + "T00:00:00");
    const dateAt = (offset: number) => {
      const d = new Date(start); d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
    const time = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
    const bool = (v: unknown, def: boolean): boolean => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : def);

    // Pre-carrega datas já preenchidas em cada tabela para merge NÃO-DESTRUTIVO.
    const [exField, exMeals, exTransp] = await Promise.all([
      supabaseAdmin.from("field_assignments").select("event_date,period").eq("visit_id", data.visitId),
      supabaseAdmin.from("meals").select("meal_date").eq("visit_id", data.visitId),
      supabaseAdmin.from("transport_schedule").select("event_date").eq("visit_id", data.visitId),
    ]);
    const fieldKey = (date: string, period: string | null | undefined) => `${date}|${period ?? "Manhã"}`;
    const fieldDates = new Set(
      (exField.data ?? []).map((r) => fieldKey(r.event_date as string, (r as { period?: string | null }).period ?? null)),
    );
    const mealDates = new Set((exMeals.data ?? []).map((r) => r.meal_date as string));
    const transpDates = new Set((exTransp.data ?? []).map((r) => r.event_date as string | null).filter(Boolean) as string[]);

    let inserted = 0;
    let skipped = 0;

    for (const it of items ?? []) {
      const p = (it.payload ?? {}) as Record<string, unknown>;
      const targetDate = dateAt(it.day_offset);
      if (it.kind === "study") {
        if (fieldDates.has(targetDate)) { skipped++; continue; }
        await supabaseAdmin.from("field_assignments").insert({
          visit_id: data.visitId, event_date: targetDate,
          period: str(p.period) ?? "Manhã",
          meeting_point: str(p.meeting_point), meeting_time: time(p.meeting_time),
          acompanhante: str(p.acompanhante), acompanhante_for: str(p.acompanhante_for),
          contact_phone: str(p.contact_phone), is_active: bool(p.is_active, true),
        });
        fieldDates.add(targetDate); inserted++;
      } else if (it.kind === "meal") {
        if (mealDates.has(targetDate)) { skipped++; continue; }
        await supabaseAdmin.from("meals").insert({
          visit_id: data.visitId, meal_date: targetDate,
          type: (str(p.type) ?? "lunch") as "lunch" | "dinner" | "breakfast",
          host_name: str(p.host_name) ?? "—",
          location: str(p.location), meal_time: time(p.meal_time),
          notes: str(p.notes), is_active: bool(p.is_active, true),
        });
        mealDates.add(targetDate); inserted++;
      } else if (it.kind === "transport") {
        if (transpDates.has(targetDate)) { skipped++; continue; }
        const allDay = bool(p.all_day, false);
        const weekday = new Date(targetDate + "T00:00:00").getDay();
        const baseShared = {
          visit_id: data.visitId, event_date: targetDate, weekday,
          all_day: allDay,
          is_active: bool(p.is_active, true),
        };
        // Parse events list (new format) with legacy single-event fallback.
        let events: Array<Record<string, unknown>> = [];
        const ej = p.events_json;
        if (typeof ej === "string" && ej.trim()) {
          try { const parsed = JSON.parse(ej); if (Array.isArray(parsed)) events = parsed as Array<Record<string, unknown>>; } catch { /* ignore */ }
        }
        if (events.length === 0 && (p.event_type || p.direction || p.departure_time || p.return_time || p.driver_name)) {
          events = [{
            event_type: p.event_type, event_type_other: p.event_type_other,
            direction: p.direction, departure_time: p.departure_time, return_time: p.return_time,
            driver_name: p.driver_name, contact_phone: p.contact_phone, notes: p.notes,
          }];
        }
        if (events.length === 0) {
          await supabaseAdmin.from("transport_schedule").insert({
            ...baseShared,
            driver_name: str(p.driver_name) ?? "—",
            contact_phone: str(p.contact_phone),
            notes: str(p.notes),
          });
        } else {
          // When all_day, only first event keeps driver/phone/notes; others inherit from first.
          const firstDriver = str(events[0]?.driver_name) ?? str(p.driver_name) ?? "—";
          const firstPhone = str(events[0]?.contact_phone) ?? str(p.contact_phone);
          const firstNotes = str(events[0]?.notes) ?? str(p.notes);
          const rows = events.map((ev, idx) => ({
            ...baseShared,
            event_type: str(ev.event_type) === "other" ? (str(ev.event_type_other) ?? "other") : str(ev.event_type),
            direction: str(ev.direction),
            departure_time: time(ev.departure_time),
            return_time: time(ev.return_time),
            driver_name: allDay ? firstDriver : (str(ev.driver_name) ?? "—"),
            contact_phone: allDay ? firstPhone : str(ev.contact_phone),
            notes: allDay ? firstNotes : str(ev.notes),
          }));
          await supabaseAdmin.from("transport_schedule").insert(rows);
        }
        transpDates.add(targetDate); inserted++;
      }
    }

    // Per-day meal notes: upsert (já não-destrutivo via onConflict).
    const mealNotes = (tpl.meal_day_notes ?? {}) as Record<string, string>;
    const noteRows = Object.entries(mealNotes)
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(([offsetStr, notes]) => ({
        visit_id: data.visitId,
        meal_date: dateAt(Number(offsetStr)),
        notes,
      }));
    if (noteRows.length) {
      await supabaseAdmin.from("meal_day_notes").upsert(noteRows, { onConflict: "visit_id,meal_date" });
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from("visits").update({ last_applied_at: now }).eq("id", data.visitId);

    return { ok: true as const, inserted, skipped, lastAppliedAt: now };
  });
