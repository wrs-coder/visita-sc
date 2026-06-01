// Esboços pessoais — fonte da verdade é o Supabase. O cliente mantém um
// cache local (IndexedDB) para velocidade e modo offline; este módulo expõe
// as server functions de sync.
//
// MUDANÇAS (lixeira + cloud-first):
//  - Removido o limite artificial de 10 esboços (custo de banco desprezível
//    e o trigger correspondente foi removido na migração).
//  - Soft-delete via `deleted_at`. A purga física fica por conta do pg_cron
//    diário (retenção de 30 dias).
//  - Novas funções: listTrashedOutlines, softDeleteOutline, restoreOutline,
//    bulkPushOutlines (migração one-shot dos esboços locais).

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
  sort_order: z.number().int().min(-1_000_000).max(1_000_000).optional().nullable(),
});

export type CloudOutlineContent = z.infer<typeof outlineContentSchema>;

// Limite "soft" para evitar abuso extremo. Não enforçado no banco.
const SOFT_LIMIT = 500;

const cloudFolderSchema = z.object({
  local_id: z.string().min(1).max(120),
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  folder_path: z.string().trim().max(500).default(""),
  deleted_at: z.string().datetime().optional().nullable(),
});

const cloudOutlineSchema = z.object({
  local_id: z.string().min(1).max(120),
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  folder_path: z.string().trim().max(500).default(""),
  content: outlineContentSchema,
  deleted_at: z.string().datetime().optional().nullable(),
});

function isFolderMarker(row: { content_json: unknown }): boolean {
  const content = row.content_json;
  return !!content && typeof content === "object" && (content as Record<string, unknown>).kind === "folder";
}

export const listCloudOutlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("personal_outlines")
      .select("id,title,folder_path,content_json,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, outlines: (data ?? []).filter((row) => !isFolderMarker(row)) };
  });

export const listCloudOutlineTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("personal_outlines")
      .select("id,title,folder_path,content_json,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    const rows = data ?? [];
    return {
      ok: true as const,
      folders: rows.filter(isFolderMarker),
      outlines: rows.filter((row) => !isFolderMarker(row)),
    };
  });

export const listTrashedOutlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("personal_outlines")
      .select("id,title,folder_path,updated_at,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, outlines: data ?? [] };
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
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }
    // Soft-limit (warning); o banco não impõe nada.
    const { count } = await supabaseAdmin
      .from("personal_outlines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);
    if ((count ?? 0) >= SOFT_LIMIT) {
      return { ok: false as const, error: `Limite de ${SOFT_LIMIT} esboços ativos atingido. Apague alguns na Lixeira.` };
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

export const bulkPushOutlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      items: z.array(z.object({
        title: z.string().trim().min(1).max(200),
        folder_path: z.string().trim().max(500).default(""),
        content: outlineContentSchema,
      })).min(1).max(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const rows = data.items.map((it) => ({
      user_id: userId,
      title: it.title,
      folder_path: it.folder_path,
      content_json: it.content,
    }));
    const { data: inserted, error } = await supabaseAdmin
      .from("personal_outlines")
      .insert(rows)
      .select("id,title,folder_path,content_json,created_at,updated_at");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, outlines: inserted ?? [] };
  });

export const replaceCloudOutlineTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      folders: z.array(cloudFolderSchema).max(500),
      outlines: z.array(cloudOutlineSchema).max(SOFT_LIMIT),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const folderRows = data.folders.map((folder) => ({
      id: folder.id ?? undefined,
      user_id: userId,
      title: folder.title,
      folder_path: folder.folder_path,
      content_json: { kind: "folder", local_id: folder.local_id },
      deleted_at: folder.deleted_at ?? null,
      updated_at: new Date().toISOString(),
    }));
    const outlineRows = data.outlines.map((outline) => ({
      id: outline.id ?? undefined,
      user_id: userId,
      title: outline.title,
      folder_path: outline.folder_path,
      content_json: { ...outline.content, local_id: outline.local_id },
      deleted_at: outline.deleted_at ?? null,
      updated_at: new Date().toISOString(),
    }));
    const rows = [...folderRows, ...outlineRows];
    if (rows.length === 0) return { ok: true as const, folders: [], outlines: [] };
    const { data: inserted, error } = await supabaseAdmin
      .from("personal_outlines")
      .upsert(rows)
      .select("id,title,folder_path,content_json,created_at,updated_at,deleted_at");
    if (error) return { ok: false as const, error: error.message };
    const saved = inserted ?? [];
    return {
      ok: true as const,
      folders: saved.filter(isFolderMarker),
      outlines: saved.filter((row) => !isFolderMarker(row)),
    };
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

// Soft-delete: move para a Lixeira (pg_cron purga após 30 dias).
export const softDeleteOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("personal_outlines")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const restoreOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("personal_outlines")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// Apaga DEFINITIVAMENTE (usado pela Lixeira "Apagar agora" e por scripts).
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
