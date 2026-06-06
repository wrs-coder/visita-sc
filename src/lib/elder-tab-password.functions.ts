// Server functions para a senha opcional da aba "Anciãos" no acesso
// de visitantes (Corpo de Anciãos / ESC).
//
// - O coordenador do corpo de anciãos define/remove a senha em
//   /programa-ancioes. Os demais anciãos cadastrados conseguem
//   visualizar a senha em texto puro.
// - O superintendente NÃO gerencia essa senha.
// - Os visitantes precisam digitar a senha (se definida) ao abrir a aba
//   "Anciãos" em /visitante/painel.
//
// As RPCs estão com EXECUTE revogado de anon/authenticated e só são
// chamadas aqui via supabaseAdmin (service_role); a autorização é feita
// dentro das próprias funções SECURITY DEFINER, com base em auth.uid().
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
  .handler(async ({ data }) => {
    // A própria RPC já valida (SECURITY DEFINER) que o caller é o
    // coordenador do corpo de anciãos da congregação.
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

// Retorna a senha em texto puro para anciãos cadastrados da congregação,
// além de indicar se o caller é o coordenador (e portanto pode editar).
export const getElderTabPasswordForElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: plain, error: errPlain } = await supabaseAdmin.rpc(
      "get_elder_tab_password",
      { _congregation_id: data.congregationId },
    );
    if (errPlain) return { ok: false as const, error: errPlain.message };
    const pw = (plain as string | null) ?? "";
    // Qualquer ancião cadastrado (coordenador, secretário, sup. de serviço)
    // pode definir/atualizar/remover a senha. O acesso à RPC acima já garante
    // que o caller é um ancião da congregação.
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
    const { data: ok, error } = await supabaseAdmin.rpc("verify_elder_tab_password", {
      _congregation_id: data.congregationId,
      _password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: !!ok };
  });
