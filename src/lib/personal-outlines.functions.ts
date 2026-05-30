// Esboços pessoais — sincronização com a nuvem (limite de 10 por usuário,
// validado por trigger no banco). Todas as escritas via supabaseAdmin com
// validação Zod. O escopo de leitura é restrito a auth.uid() via RLS, mas
// o middleware requireSupabaseAuth garante o userId no servidor.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const outlineContentSchema = z.object({
  prayer: z.string().max(2000).optional().nullable(),
  territory: z.string().max(400).optional().nullable(),
  assistants: z.string().max(2000).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  content: z.string().max(100_000).default(""),
});

export type CloudOutlineContent = z.infer<typeof outlineContentSchema>;

export const listCloudOutlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("personal_outlines")
      .select("id,title,folder_path,content_json,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, outlines: data ?? [], remaining: Math.max(0, 10 - (data?.length ?? 0)) };
  });

export const pushOutlineToCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(1).max(200),
      folder_path: z.string().trim().max(500).default(""),
      content: outlineContentSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.id) {
      // Atualiza um existente do mesmo usuário (sem disparar trigger de limite).
      const { data: own } = await supabaseAdmin
        .from("personal_outlines")
        .select("id").eq("id", data.id).eq("user_id", userId).maybeSingle();
      if (!own) return { ok: false as const, error: "Esboço não encontrado." };
      const { error } = await supabaseAdmin
        .from("personal_outlines")
        .update({
          title: data.title,
          folder_path: data.folder_path,
          content_json: data.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }
    // Limite reforçado no app (trigger faz o backstop).
    const { count } = await supabaseAdmin
      .from("personal_outlines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= 10) {
      return { ok: false as const, error: "Limite de 10 esboços na nuvem atingido." };
    }
    const { data: row, error } = await supabaseAdmin
      .from("personal_outlines")
      .insert({
        user_id: userId,
        title: data.title,
        folder_path: data.folder_path,
        content_json: data.content,
      })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao salvar." };
    return { ok: true as const, id: row.id };
  });

export const pullOutlineFromCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row, error } = await supabaseAdmin
      .from("personal_outlines")
      .select("id,title,folder_path,content_json,created_at,updated_at")
      .eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    if (!row) return { ok: false as const, error: "Esboço não encontrado." };
    return { ok: true as const, outline: row };
  });

export const deleteCloudOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("personal_outlines")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
