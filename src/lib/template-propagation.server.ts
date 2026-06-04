// Server-only helpers for template-propagation.functions.ts.
// Lives in a *.server.ts file to (a) be excluded from client bundles and
// (b) keep helpers OUT of the sibling scope that the TanStack server-fn
// splitter strips per .handler() chunk.

import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";

export type AdminClient = typeof _admin;

export const TEMPLATE_TYPES = [
  "field_meeting",
  "meeting_talk",
  "checklist",
  "elder_program",
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  field_meeting: "Reuniões para serviço de campo",
  meeting_talk: "Reuniões e discursos",
  checklist: "Checklist",
  elder_program: "Programação com anciãos",
};

export const TEMPLATE_TABLE: Record<TemplateType, string> = {
  field_meeting: "field_meeting_templates",
  meeting_talk: "meeting_talk_templates",
  checklist: "checklist_templates",
  elder_program: "elder_program_templates",
};

export function getAdmin(): AdminClient {
  return _admin;
}
