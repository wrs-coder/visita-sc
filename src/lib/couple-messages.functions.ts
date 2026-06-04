import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAdmin,
  groupThreads,
  resolveWifeSuperId,
  type CoupleMessage,
} from "./couple-messages.server";

export type { CoupleMessage, CoupleThread } from "./couple-messages.server";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/);

// ===== Superintendente (autenticado) =====

export const listCoupleMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("couple_messages")
      .select("*")
      .eq("superintendent_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CoupleMessage[];
    const unread = rows.filter((r) => r.author === "wife" && !r.read_by_super).length;
    return { ok: true as const, threads: groupThreads(rows), unread };
  });

export const createCoupleMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        parentId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(200).nullable().optional(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isReply = !!data.parentId;
    const { error } = await supabase.from("couple_messages").insert({
      superintendent_id: userId,
      parent_id: data.parentId ?? null,
      author: "super",
      title: isReply ? null : (data.title ?? null),
      body: data.body,
      read_by_super: true,
      read_by_wife: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const markCoupleMessagesReadSuper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("couple_messages")
      .update({ read_by_super: true })
      .eq("superintendent_id", userId)
      .eq("author", "wife")
      .eq("read_by_super", false);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCoupleThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ rootId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("couple_messages")
      .delete()
      .eq("superintendent_id", userId)
      .eq("id", data.rootId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ===== Esposa (via wife_invite_code) =====

export const wifeListCoupleMessages = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ inviteCode: codeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = getAdmin();
    const superId = await resolveWifeSuperId(data.inviteCode);
    if (!superId) return { ok: false as const, error: "Código inválido." };
    const { data: rows, error } = await supabaseAdmin
      .from("couple_messages")
      .select("*")
      .eq("superintendent_id", superId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as CoupleMessage[];
    const unread = list.filter((r) => r.author === "super" && !r.read_by_wife).length;
    return { ok: true as const, threads: groupThreads(list), unread };
  });

export const wifeCreateCoupleMessage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        inviteCode: codeSchema,
        parentId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(200).nullable().optional(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = getAdmin();
    const superId = await resolveWifeSuperId(data.inviteCode);
    if (!superId) return { ok: false as const, error: "Código inválido." };
    const isReply = !!data.parentId;
    const { error } = await supabaseAdmin.from("couple_messages").insert({
      superintendent_id: superId,
      parent_id: data.parentId ?? null,
      author: "wife",
      title: isReply ? null : (data.title ?? null),
      body: data.body,
      read_by_super: false,
      read_by_wife: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const wifeMarkCoupleMessagesRead = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ inviteCode: codeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = getAdmin();
    const superId = await resolveWifeSuperId(data.inviteCode);
    if (!superId) return { ok: false as const };
    await supabaseAdmin
      .from("couple_messages")
      .update({ read_by_wife: true })
      .eq("superintendent_id", superId)
      .eq("author", "super")
      .eq("read_by_wife", false);
    return { ok: true as const };
  });
