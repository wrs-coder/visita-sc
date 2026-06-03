// Server functions para a senha opcional da aba "Anciãos" no acesso
// de visitantes (Corpo de Anciãos / ESC).
//
// - O superintendente define/remove a senha em /programa-ancioes.
// - Os visitantes precisam digitar a senha (se definida) ao abrir a aba
//   "Anciãos" em /visitante/painel. Não se aplica ao superintendente
//   (ele já tem acesso autenticado).
//
// As RPCs `set_elder_tab_password`, `verify_elder_tab_password` e
// `elder_tab_password_is_set` têm EXECUTE revogado de anon/authenticated
// e só são chamadas aqui via supabaseAdmin (service_role), com a
// autorização aplicada pelo próprio server function.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const setSchema = z.object({
  congregationId: z.string().uuid(),
  // string vazia = remover a senha
  newPassword: z.string().max(128),
});

export const setElderTabPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verifica que o caller é o superintendente da congregação.
    const { data: cong, error: congErr } = await supabaseAdmin
      .from("congregations")
      .select("id, superintendent_id")
      .eq("id", data.congregationId)
      .maybeSingle();
    if (congErr || !cong) return { ok: false as const, error: "Congregação não encontrada." };
    if (cong.superintendent_id !== userId) return { ok: false as const, error: "Acesso negado." };

    const { error } = await supabaseAdmin.rpc("set_elder_tab_password", {
      _congregation_id: data.congregationId,
      _new_password: data.newPassword,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

const statusSchema = z.object({ congregationId: z.string().uuid() });

export const getElderTabPasswordStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: isSet, error } = await supabaseAdmin.rpc("elder_tab_password_is_set", {
      _congregation_id: data.congregationId,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, isSet: !!isSet };
  });

const verifySchema = z.object({
  congregationId: z.string().uuid(),
  password: z.string().min(1).max(128),
});

export const verifyElderTabPassword = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { data: ok, error } = await supabaseAdmin.rpc("verify_elder_tab_password", {
      _congregation_id: data.congregationId,
      _password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: !!ok };
  });
