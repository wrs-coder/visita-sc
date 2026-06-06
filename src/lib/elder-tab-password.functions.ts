// Server functions para a senha opcional da aba "Anciãos" no acesso
// de visitantes (Corpo de Anciãos / ESC).
//
// - Qualquer ancião cadastrado na congregação define/remove a senha em
//   /programa-ancioes e consegue visualizar a senha em texto puro.
// - O superintendente NÃO gerencia essa senha.
// - Os visitantes precisam digitar a senha (se definida) ao abrir a aba
//   "Anciãos" em /visitante/painel.
//
// As RPCs estão com EXECUTE revogado de anon/authenticated e só são
// chamadas aqui via supabaseAdmin (service_role); a autorização é feita
// nestas server functions, com base no usuário autenticado.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setSchema = z.object({
  congregationId: z.string().uuid(),
  // string vazia = remover a senha
  newPassword: z.string().max(128),
});

export const setElderTabPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: elderRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "elder")
      .eq("congregation_id", data.congregationId)
      .maybeSingle();
    if (roleError) return { ok: false as const, error: roleError.message };
    if (!elderRole) return { ok: false as const, error: "Apenas anciãos cadastrados podem definir essa senha." };

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isSet, error } = await supabaseAdmin.rpc("elder_tab_password_is_set", {
      _congregation_id: data.congregationId,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, isSet: !!isSet };
  });

// Retorna a senha em texto puro para anciãos cadastrados da congregação,
// além de indicar se o caller é o coordenador (e portanto pode editar).
export const getElderTabPasswordForElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: elderRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "elder")
      .eq("congregation_id", data.congregationId)
      .maybeSingle();
    if (roleError) return { ok: false as const, error: roleError.message };
    if (!elderRole) return { ok: false as const, error: "Acesso negado." };

    const { data: congregation, error: congregationError } = await supabaseAdmin
      .from("congregations")
      .select("elder_tab_password_plain")
      .eq("id", data.congregationId)
      .maybeSingle();
    if (congregationError) return { ok: false as const, error: congregationError.message };
    const pw = congregation?.elder_tab_password_plain ?? "";
    return {
      ok: true as const,
      password: pw,
      isCoordinator: true,
      isSet: pw.length > 0,
    };
  });

const verifySchema = z.object({
  congregationId: z.string().uuid(),
  password: z.string().min(1).max(128),
});

export const verifyElderTabPassword = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("verify_elder_tab_password", {
      _congregation_id: data.congregationId,
      _password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: !!ok };
  });
