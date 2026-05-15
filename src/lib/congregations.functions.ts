import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// All operations below verify that the calling user owns the row before
// touching invite_code (which is hidden from regular clients).

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/);

export const listMyCongregations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("congregations")
      .select("id,name,invite_code,superintendent_id,is_active,created_at")
      .eq("superintendent_id", userId)
      .order("name");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, data: data ?? [] };
  });

export const createCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      inviteCode: codeSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: dup } = await supabaseAdmin.from("congregations")
      .select("id").eq("invite_code", data.inviteCode).maybeSingle();
    if (dup) return { ok: false as const, error: "Este código já está em uso." };
    const { data: row, error } = await supabaseAdmin.from("congregations")
      .insert({ name: data.name, invite_code: data.inviteCode, superintendent_id: userId })
      .select("id,name,invite_code,superintendent_id,created_at").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, data: row };
  });

export const updateCongregation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      inviteCode: codeSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin.from("congregations")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { data: dup } = await supabaseAdmin.from("congregations")
      .select("id").eq("invite_code", data.inviteCode).neq("id", data.id).maybeSingle();
    if (dup) return { ok: false as const, error: "Código já em uso." };
    const { error } = await supabaseAdmin.from("congregations")
      .update({ name: data.name, invite_code: data.inviteCode }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
