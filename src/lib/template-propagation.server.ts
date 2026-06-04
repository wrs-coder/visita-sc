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

/**
 * Helper interno chamado pelos *.functions.ts dos 4 tipos de modelo após
 * um salvamento bem-sucedido. Nunca lança — apenas registra log em caso de
 * erro. Sustentabilidade: 1 SELECT + 1 UPSERT em lote, sem laços por visita.
 *
 * Deve ser chamado APENAS de dentro de um `.handler()` (contexto server-only).
 */
export async function recordTemplateChanged(
  templateType: TemplateType,
  templateId: string,
): Promise<void> {
  try {
    const supabaseAdmin = _admin;
    const table = TEMPLATE_TABLE[templateType];
    const adminAny = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: { id: string; congregation_id: string | null; name: string | null } | null;
            }>;
          };
        };
      };
    };
    const { data: tpl } = await adminAny
      .from(table)
      .select("id,congregation_id,name")
      .eq("id", templateId)
      .maybeSingle();
    if (!tpl?.congregation_id) return;

    const today = new Date().toISOString().slice(0, 10);
    const { data: visits } = await supabaseAdmin
      .from("visits")
      .select("id")
      .eq("congregation_id", tpl.congregation_id)
      .gt("start_date", today);

    if (!visits?.length) return;

    const { generateTemplateBackupPdf } = await import("./template-backup.server");
    const backupPath = await generateTemplateBackupPdf({
      table,
      templateType,
      templateId,
      congregationId: tpl.congregation_id,
      templateName: tpl.name,
    });

    const visitIds = visits.map((v: { id: string }) => v.id);
    await supabaseAdmin
      .from("visit_pending_updates")
      .delete()
      .in("visit_id", visitIds)
      .eq("template_type", templateType)
      .eq("template_id", templateId)
      .is("resolved_at", null);

    const rows = visitIds.map((vid: string) => ({
      visit_id: vid,
      template_type: templateType,
      template_id: templateId,
      diff: { changed_at: new Date().toISOString() },
      backup_pdf_path: backupPath,
    }));
    await supabaseAdmin.from("visit_pending_updates").insert(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[template-propagation] recordTemplateChanged failed:", err);
  }
}
