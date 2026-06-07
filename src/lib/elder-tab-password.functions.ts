// Server functions para a senha opcional da aba "Anciãos" no acesso
// de visitantes (Corpo de Anciãos / ESC).
//
// Regras de autorização (Missão 1):
// - Qualquer ancião cadastrado da congregação pode DEFINIR a senha quando
//   ainda não existe (status livre).
// - Após definida, apenas o ancião que criou a senha (`elder_tab_password_created_by`)
//   ou o superintendente da congregação podem ATUALIZAR ou REMOVER.
// - O superintendente sempre pode redefinir/remover (controle final).
// - Cada alteração registra auditoria em `elder_tab_password_audit`.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setSchema = z.object({
  congregationId: z.string().uuid(),
  newPassword: z.string().max(128), // string vazia = remover
});

type Authz = {
  isSuper: boolean;
  isElder: boolean;
  isCreator: boolean;
  hasPassword: boolean;
  plainPassword: string | null;
  createdBy: string | null;
};

async function loadAuthz(userId: string, congregationId: string): Promise<Authz | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cong, error: cErr } = await supabaseAdmin
    .from("congregations")
    .select("superintendent_id, elder_tab_password_hash, elder_tab_password_plain, elder_tab_password_created_by")
    .eq("id", congregationId)
    .maybeSingle();
  if (cErr) return { error: cErr.message };
  if (!cong) return { error: "Congregação não encontrada." };

  const isSuper = cong.superintendent_id === userId;
  let isElder = false;
  if (!isSuper) {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "elder")
      .eq("congregation_id", congregationId)
      .maybeSingle();
    isElder = !!role;
  }
  return {
    isSuper,
    isElder,
    isCreator: cong.elder_tab_password_created_by === userId,
    hasPassword: cong.elder_tab_password_hash !== null,
    plainPassword: cong.elder_tab_password_plain ?? null,
    createdBy: cong.elder_tab_password_created_by ?? null,
  };
}

export const setElderTabPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const az = await loadAuthz(context.userId, data.congregationId);
    if ("error" in az) return { ok: false as const, error: az.error };
    if (!az.isSuper && !az.isElder) {
      return { ok: false as const, error: "Apenas anciãos cadastrados ou o superintendente podem gerenciar essa senha." };
    }
    // Quando já existe senha, somente criador OU superintendente.
    if (az.hasPassword && !az.isSuper && !az.isCreator) {
      return {
        ok: false as const,
        error: "Apenas o ancião que criou a senha (ou o superintendente) pode alterá-la.",
      };
    }
    const { error } = await supabaseAdmin.rpc("set_elder_tab_password", {
      _congregation_id: data.congregationId,
      _new_password: data.newPassword,
      _actor_user_id: context.userId,
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

// Retorna informações do cartão para um ancião ou para o superintendente.
// - Criador OU superintendente: recebe `password` em texto puro e `canEdit=true`.
// - Demais anciãos cadastrados: só sabem `isSet` e quem criou (para pedir a senha).
export const getElderTabPasswordForElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const az = await loadAuthz(context.userId, data.congregationId);
    if ("error" in az) return { ok: false as const, error: az.error };
    if (!az.isSuper && !az.isElder) {
      return { ok: false as const, error: "Acesso negado." };
    }

    const canEdit = az.isSuper || !az.hasPassword || az.isCreator;
    let createdByName: string | null = null;
    if (az.createdBy) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("full_name").eq("id", az.createdBy).maybeSingle();
      createdByName = prof?.full_name ?? null;
    }

    const exposePlain = az.isSuper || az.isCreator;
    return {
      ok: true as const,
      isSet: az.hasPassword,
      canEdit,
      isCreator: az.isCreator,
      isSuper: az.isSuper,
      createdByName,
      // Mantém compatibilidade com a UI atual (campo `password`).
      password: exposePlain ? az.plainPassword ?? "" : "",
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
