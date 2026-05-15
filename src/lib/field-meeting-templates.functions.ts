import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 24;

export const FIELD_MODALITIES = [
  "casa_em_casa",
  "estudos_revisitas",
  "telefone",
  "cartas",
  "telefone_cartas",
  "grupo_de_campo",
] as const;

export const FIELD_MODALITY_LABELS: Record<(typeof FIELD_MODALITIES)[number], string> = {
  casa_em_casa: "Pregação de casa em casa",
  estudos_revisitas: "Estudos e revisitas",
  telefone: "Telefone",
  cartas: "Cartas",
  telefone_cartas: "Telefone + Cartas",
  grupo_de_campo: "Grupo de campo",
};

const modalitySchema = z.enum(FIELD_MODALITIES);
const nameSchema = z.string().trim().min(1).max(120);

export const listFieldMeetingTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id,name,congregation_id,modality,created_at,updated_at")
      .eq("superintendent_id", userId)
      .order("created_at");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, templates: data ?? [] };
  });

export const getCongregationFieldModality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ congregationId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("modality")
      .eq("congregation_id", data.congregationId)
      .maybeSingle();
    return { ok: true as const, modality: (row?.modality ?? null) as (typeof FIELD_MODALITIES)[number] | null };
  });

export const createFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: nameSchema,
      modality: modalitySchema.default("casa_em_casa"),
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    if (data.congregationId) {
      const owns = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!owns.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("field_meeting_templates")
        .select("id").eq("congregation_id", data.congregationId).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { data: row, error } = await supabaseAdmin.from("field_meeting_templates")
      .insert({
        superintendent_id: userId,
        name: data.name,
        modality: data.modality,
        congregation_id: data.congregationId ?? null,
      })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, id: row.id };
  });

export const updateFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: nameSchema.optional(),
      modality: modalitySchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const patch: Record<string, unknown> = {};
    if (data.name) patch.name = data.name;
    if (data.modality) patch.modality = data.modality;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin.from("field_meeting_templates").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const linkFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), congregationId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    if (data.congregationId) {
      const ownsCong = await supabaseAdmin.from("congregations")
        .select("id").eq("id", data.congregationId).eq("superintendent_id", userId).maybeSingle();
      if (!ownsCong.data) return { ok: false as const, error: "Congregação inválida." };
      const dup = await supabaseAdmin.from("field_meeting_templates")
        .select("id").eq("congregation_id", data.congregationId).neq("id", data.id).maybeSingle();
      if (dup.data) return { ok: false as const, error: "Esta congregação já tem um modelo vinculado." };
    }
    const { error } = await supabaseAdmin.from("field_meeting_templates")
      .update({ congregation_id: data.congregationId }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const duplicateFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), name: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin.from("field_meeting_templates")
      .select("id,superintendent_id,modality").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { count } = await supabaseAdmin
      .from("field_meeting_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin.from("field_meeting_templates")
      .insert({ superintendent_id: userId, name: data.name, modality: src.modality, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    return { ok: true as const, id: row.id };
  });

export const deleteFieldMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("field_meeting_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("field_meeting_templates").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
