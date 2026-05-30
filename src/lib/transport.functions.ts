// Transporte — escritas via createServerFn com validação Zod.
// Usa o cliente Supabase autenticado (RLS aplica can_edit_visit como o usuário),
// garantindo dupla camada: validação no servidor + política no banco.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventTypeEnum = z.enum([
  "field_service",
  "meeting",
  "airport",
  "meal",
  "personal",
  "other",
]);

const directionEnum = z.enum(["pickup", "dropoff", "round_trip"]);

const timeStr = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/)
  .optional()
  .nullable();

const slotSchema = z.object({
  id: z.string().uuid().optional(),
  visit_id: z.string().uuid(),
  driver_name: z.string().trim().min(1).max(120),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  event_type: eventTypeEnum.optional().nullable(),
  direction: directionEnum.optional().nullable(),
  all_day: z.boolean().default(false),
  departure_time: timeStr,
  return_time: timeStr,
  description: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const upsertTransportSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => slotSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      contact_phone: rest.contact_phone || null,
      event_date: rest.event_date || null,
      weekday: rest.weekday ?? null,
      event_type: rest.event_type || null,
      direction: rest.direction || null,
      departure_time: rest.all_day ? null : rest.departure_time || null,
      return_time: rest.all_day ? null : rest.return_time || null,
      description: rest.description || null,
      notes: rest.notes || null,
    };
    if (id) {
      const { error } = await supabase
        .from("transport_schedule")
        .update(payload)
        .eq("id", id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id };
    }
    const { data: row, error } = await supabase
      .from("transport_schedule")
      .insert(payload)
      .select("id")
      .single();
    if (error || !row) {
      return { ok: false as const, error: error?.message ?? "Falha ao salvar." };
    }
    return { ok: true as const, id: row.id };
  });

export const toggleTransportSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transport_schedule")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteTransportSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transport_schedule")
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// Replica motorista/telefone para os demais slots do mesmo event_date (ou weekday)
// quando o usuário marca "Dia inteiro".
export const applyAllDayDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        visit_id: z.string().uuid(),
        source_id: z.string().uuid(),
        event_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        weekday: z.number().int().min(0).max(6).optional().nullable(),
        driver_name: z.string().trim().min(1).max(120),
        contact_phone: z.string().trim().max(40).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("transport_schedule")
      .update({
        driver_name: data.driver_name,
        contact_phone: data.contact_phone || null,
      })
      .eq("visit_id", data.visit_id)
      .neq("id", data.source_id);
    if (data.event_date) q = q.eq("event_date", data.event_date);
    else if (data.weekday != null) q = q.eq("weekday", data.weekday);
    else return { ok: false as const, error: "Sem data ou dia para replicar." };
    const { error, count } = await q.select("id", { count: "exact" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, updated: count ?? 0 };
  });
