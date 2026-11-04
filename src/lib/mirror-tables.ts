// Todas as tabelas do backend que o celular guarda ("baixar tudo").
//
// Cada uma tem `updated_at` (download incremental) e uma chave própria.
// Ficam de fora apenas tabelas internas do servidor (registro de auditoria
// e marcas de exclusão), que nenhuma tela mostra.

export const MIRROR_ID_FIELD: Record<string, string> = {
  // Circuito e congregações
  congregations: "id",
  circuit_schedule_events: "id",
  itinerary_weeks: "id",
  circuit_big_events: "id",
  circuit_big_event_parts: "id",
  letter_templates: "id",
  visit_packages: "id",
  // Visitas e tudo que pertence a uma visita
  visits: "id",
  visit_template_overrides: "visit_id",
  visit_pending_updates: "id",
  schedule_events: "id",
  checklist_items: "id",
  field_assignments: "id",
  field_meetings: "id",
  meals: "id",
  meal_day_notes: "id",
  transport_schedule: "id",
  midweek_meetings: "id",
  weekend_meetings: "id",
  pioneer_meetings: "id",
  elders_servants_meetings: "id",
  elder_pastoral_visits: "id",
  elder_encouragements: "id",
  elder_recommendations: "id",
  elder_local_matters: "id",
  elder_program_visit_sections: "id",
  elder_program_visit_slots: "id",
  // Modelos
  program_templates: "id",
  program_template_items: "id",
  checklist_templates: "id",
  checklist_template_items: "id",
  field_meeting_templates: "id",
  field_meeting_template_items: "id",
  meeting_talk_templates: "id",
  meeting_talk_template_midweek: "template_id",
  meeting_talk_template_elders: "template_id",
  meeting_talk_template_pioneer: "template_id",
  meeting_talk_template_weekend_themes: "id",
  elder_program_templates: "id",
  elder_program_template_events: "id",
  elder_program_template_sections: "id",
  elder_program_template_slots: "id",
  talk_themes: "id",
  // Pessoal
  private_notes: "id",
  personal_outlines: "id",
  couple_messages: "id",
  profiles: "id",
  user_roles: "id",
};

export const MIRROR_TABLES = Object.keys(MIRROR_ID_FIELD);

export function mirrorIdField(table: string): string {
  return MIRROR_ID_FIELD[table] ?? "id";
}

export function isMirrorTable(table: string): boolean {
  return Object.prototype.hasOwnProperty.call(MIRROR_ID_FIELD, table);
}
