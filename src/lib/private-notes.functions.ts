// Soft-delete e restauração de notas privadas (Lixeira).
// Lê/escreve via supabaseAdmin com escopo estrito ao auth.uid() do middleware.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTrashedNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("private_notes")
      .select("id,title,note_type,updated_at,deleted_at,congregation_id")
      .eq("superintendent_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, notes: data ?? [] };
  });

export const softDeleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("private_notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("superintendent_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const restoreNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("private_notes")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("superintendent_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const purgeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("private_notes")
      .delete()
      .eq("id", data.id)
      .eq("superintendent_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const emptyNotesTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("private_notes")
      .delete()
      .eq("superintendent_id", userId)
      .not("deleted_at", "is", null);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
