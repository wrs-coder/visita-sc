// Resumo do "quanto os anciãos já preencheram" antes do Superintendente
// excluir uma visita do itinerário. Conta, por tabela, apenas registros
// com conteúdo real — placeholders auto-criados (ex.: midweek_meetings
// vazio) são ignorados para evitar falsos positivos.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ visitId: z.string().uuid() });

export interface VisitFillItem {
  /** Identificador estável para a UI (i18n). */
  key: string;
  /** Rótulo legível em pt-BR. */
  label: string;
  /** Quantidade de registros já preenchidos. */
  count: number;
}

export interface VisitFillSummary {
  ok: true;
  hasContent: boolean;
  totalCount: number;
  items: VisitFillItem[];
}

export interface VisitFillSummaryError {
  ok: false;
  error: string;
}

export const getVisitFillSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<VisitFillSummary | VisitFillSummaryError> => {
    const { supabase } = context;
    const visitId = data.visitId;

    // Para tabelas que sempre representam "conteúdo" (cada linha existe
    // porque alguém criou), basta contar todas as linhas.
    // Para tabelas com row placeholder auto-criado (midweek/weekend/
    // pioneer/elders_servants), usamos `.or(...)` para exigir que ao
    // menos um campo de conteúdo esteja preenchido.

    const head = { count: "exact" as const, head: true };

    const queries = await Promise.all([
      supabase.from("meals").select("id", head).eq("visit_id", visitId)
        .or("host_name.not.is.null,location.not.is.null,contact_phone.not.is.null,notes.not.is.null"),
      supabase.from("meal_day_notes").select("id", head).eq("visit_id", visitId),
      supabase.from("transport_schedule").select("id", head).eq("visit_id", visitId)
        .or("driver_name.not.is.null,contact_phone.not.is.null,description.not.is.null,notes.not.is.null"),
      supabase.from("field_assignments").select("id", head).eq("visit_id", visitId)
        .or("meeting_point.not.is.null,acompanhante.not.is.null,contact_phone.not.is.null"),
      supabase.from("field_meetings").select("id", head).eq("visit_id", visitId)
        .or("territory_number.not.is.null,territory_location.not.is.null,meeting_location.not.is.null,auxiliary_leaders.not.is.null,closing_prayer.not.is.null,observations.not.is.null"),
      supabase.from("schedule_events").select("id", head).eq("visit_id", visitId),
      supabase.from("checklist_items").select("id", head).eq("visit_id", visitId)
        .or("status.eq.done,info_text.not.is.null,link_or_notes.not.is.null"),
      supabase.from("midweek_meetings").select("id", head).eq("visit_id", visitId)
        .or("chairman.not.is.null,service_talk_theme.not.is.null,closing_prayer.not.is.null"),
      supabase.from("weekend_meetings").select("id", head).eq("visit_id", visitId)
        .or("public_talk_theme.not.is.null,talk_theme_title.not.is.null"),
      supabase.from("pioneer_meetings").select("id", head).eq("visit_id", visitId)
        .or("theme.not.is.null,location.not.is.null,opening_prayer.not.is.null,closing_prayer.not.is.null"),
      supabase.from("elders_servants_meetings").select("id", head).eq("visit_id", visitId)
        .or("theme.not.is.null,location.not.is.null,opening_prayer.not.is.null,closing_prayer.not.is.null"),
    ]);

    const [
      meals,
      mealNotes,
      transport,
      assignments,
      fieldMeetings,
      schedule,
      checklist,
      midweek,
      weekend,
      pioneer,
      elders,
    ] = queries;

    for (const q of queries) {
      if (q.error) {
        return { ok: false, error: q.error.message };
      }
    }

    const items: VisitFillItem[] = [
      { key: "meals", label: "Refeições preenchidas", count: meals.count ?? 0 },
      { key: "mealNotes", label: "Observações de refeições por dia", count: mealNotes.count ?? 0 },
      { key: "transport", label: "Registros de transporte", count: transport.count ?? 0 },
      { key: "fieldAssignments", label: "Designações de estudos de campo", count: assignments.count ?? 0 },
      { key: "fieldMeetings", label: "Reuniões para serviço de campo", count: fieldMeetings.count ?? 0 },
      { key: "schedule", label: "Eventos do cronograma", count: schedule.count ?? 0 },
      { key: "checklist", label: "Itens do checklist preenchidos", count: checklist.count ?? 0 },
      { key: "midweek", label: "Reunião do meio de semana", count: midweek.count ?? 0 },
      { key: "weekend", label: "Reunião do fim de semana", count: weekend.count ?? 0 },
      { key: "pioneer", label: "Reunião com pioneiros", count: pioneer.count ?? 0 },
      { key: "elders", label: "Reunião com anciãos e servos", count: elders.count ?? 0 },
    ].filter((x) => x.count > 0);

    const totalCount = items.reduce((acc, it) => acc + it.count, 0);

    return {
      ok: true,
      hasContent: items.length > 0,
      totalCount,
      items,
    };
  });
