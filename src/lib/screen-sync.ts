// Sincronizar só a tela aberta: envia pendências e baixa apenas as tabelas
// que aquela tela lê. Rota sem mapa → null (o botão cai no "Sincronizar tudo").
import { MIRROR_TABLES } from "@/lib/mirror-tables";

export const SCREEN_SYNC_EVENT = "visita-sc:screen-synced";

const VISIT_BASE = ["visits", "congregations", "visit_template_overrides", "visit_pending_updates"];
const MEETINGS = ["midweek_meetings", "weekend_meetings", "pioneer_meetings", "elders_servants_meetings", "talk_themes"];
const ELDER_PROGRAM = ["elder_pastoral_visits", "elder_encouragements", "elder_recommendations", "elder_local_matters", "elder_program_visit_sections", "elder_program_visit_slots"];

export const SCREEN_TABLES: Record<string, { label: string; tables: string[] }> = {
  "/dashboard": { label: "Painel", tables: [...VISIT_BASE, "schedule_events", "circuit_schedule_events", "itinerary_weeks", "meals", "field_meetings", "field_assignments", "transport_schedule", ...MEETINGS, "couple_messages", "private_notes"] },
  "/cronograma": { label: "Cronograma", tables: ["circuit_schedule_events", "itinerary_weeks", "visits", "congregations", "circuit_big_events"] },
  "/configuracoes": { label: "Itinerário", tables: ["itinerary_weeks", "visits", "congregations", "visit_packages"] },
  "/congregacoes": { label: "Congregações e Grandes Eventos", tables: ["congregations", "visits", "profiles", "user_roles", "circuit_big_events", "circuit_big_event_parts", "letter_templates"] },
  "/checklist": { label: "Checklist", tables: [...VISIT_BASE, "checklist_items"] },
  "/refeicoes": { label: "Refeições", tables: [...VISIT_BASE, "meals", "meal_day_notes"] },
  "/transporte": { label: "Transporte", tables: [...VISIT_BASE, "transport_schedule"] },
  "/escala": { label: "Escala", tables: [...VISIT_BASE, "field_assignments"] },
  "/reunioes-de-campo": { label: "Reuniões de campo", tables: [...VISIT_BASE, "field_meetings", "field_assignments"] },
  "/reunioes-discursos": { label: "Reuniões e discursos", tables: [...VISIT_BASE, ...MEETINGS] },
  "/programa-ancioes": { label: "Programa dos anciãos", tables: [...VISIT_BASE, ...ELDER_PROGRAM] },
  "/resumo-semana": { label: "Resumo da semana", tables: [...VISIT_BASE, "schedule_events", "meals", "field_meetings", "transport_schedule", ...MEETINGS] },
  "/notas": { label: "Notas", tables: ["private_notes", "visits", "congregations"] },
  "/consideracoes-campo": { label: "Considerações", tables: ["private_notes", "personal_outlines"] },
  "/estudo-pessoal": { label: "Estudo e anotações", tables: ["personal_outlines", "private_notes"] },
  "/comunicacao-casal": { label: "Recados", tables: ["couple_messages"] },
  "/pacotes-visita": { label: "Pacotes", tables: ["visit_packages"] },
  "/modelos": { label: "Modelos", tables: ["program_templates", "program_template_items"] },
  "/checklist-modelos": { label: "Modelos de checklist", tables: ["checklist_templates", "checklist_template_items"] },
  "/modelo-reunioes-de-campo": { label: "Modelos de campo", tables: ["field_meeting_templates", "field_meeting_template_items"] },
  "/modelo-reunioes-discursos": { label: "Modelos de reuniões", tables: ["meeting_talk_templates", "meeting_talk_template_midweek", "meeting_talk_template_elders", "meeting_talk_template_pioneer", "meeting_talk_template_weekend_themes", "talk_themes"] },
  "/modelo-programacao-ancioes": { label: "Modelos dos anciãos", tables: ["elder_program_templates", "elder_program_template_events", "elder_program_template_sections", "elder_program_template_slots"] },
};

/** Tabelas da tela (sem repetição), ou null quando a rota não tem mapa. */
export function screenSyncTarget(pathname: string): { label: string; tables: string[] } | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const hit = SCREEN_TABLES[path] ?? SCREEN_TABLES[Object.keys(SCREEN_TABLES).find((k) => path.startsWith(k + "/")) ?? ""];
  if (!hit) return null;
  return { label: hit.label, tables: [...new Set(hit.tables)].filter((t) => MIRROR_TABLES.includes(t)) };
}
