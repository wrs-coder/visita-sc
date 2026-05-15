import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPER_CODE = "152832";

function genInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const registerSuperintendent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(200),
      password: z.string().min(6).max(100),
      code: z.string().trim().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.code !== SUPER_CODE) {
      return { ok: false as const, error: "Código de superintendente inválido." };
    }

    const { data: created, error: signErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (signErr || !created.user) {
      return { ok: false as const, error: signErr?.message ?? "Falha ao criar conta." };
    }
    const userId = created.user.id;

    await supabaseAdmin.from("profiles").update({
      full_name: data.fullName,
      email: data.email,
    }).eq("id", userId);

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: "superintendent", congregation_id: null,
    });

    return { ok: true as const };
  });

const ELDER_POSITIONS = ["coordenador", "secretario", "sup_servico", "corpo"] as const;

export const registerElder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(200),
      password: z.string().min(6).max(100),
      inviteCode: z.string().trim().min(4).max(20),
      position: z.enum(ELDER_POSITIONS),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: cong, error: cErr } = await supabaseAdmin
      .from("congregations").select("id").eq("invite_code", data.inviteCode.toUpperCase()).maybeSingle();
    if (cErr) return { ok: false as const, error: cErr.message };
    if (!cong) return { ok: false as const, error: "Código de congregação inválido." };

    const { data: created, error: signErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (signErr || !created.user) {
      return { ok: false as const, error: signErr?.message ?? "Falha ao criar conta." };
    }
    const userId = created.user.id;

    await supabaseAdmin.from("profiles").update({
      full_name: data.fullName, email: data.email, congregation_id: cong.id,
    }).eq("id", userId);

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
    });

    return { ok: true as const };
  });

// For users that signed in via Google OAuth — finalize role using a code
export const linkAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      mode: z.enum(["superintendent", "elder"]),
      code: z.string().trim().min(1),
      fullName: z.string().trim().min(1).max(120).optional(),
      position: z.enum(ELDER_POSITIONS).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Identify user from auth header
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const auth = getRequestHeader("authorization");
    if (!auth?.startsWith("Bearer ")) return { ok: false as const, error: "Não autenticado." };
    const token = auth.slice(7);
    const { data: claims, error: cErr } = await supabaseAdmin.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return { ok: false as const, error: "Sessão inválida." };
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string | undefined) ?? null;

    if (data.mode === "superintendent") {
      if (data.code !== SUPER_CODE) return { ok: false as const, error: "Código de superintendente inválido." };

      await supabaseAdmin.from("profiles").update({
        full_name: data.fullName ?? undefined, email,
      }).eq("id", userId);
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId, role: "superintendent", congregation_id: null,
      });
      return { ok: true as const };
    } else {
      if (!data.position) return { ok: false as const, error: "Selecione sua designação." };
      const { data: cong } = await supabaseAdmin.from("congregations")
        .select("id").eq("invite_code", data.code.toUpperCase()).maybeSingle();
      if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
      await supabaseAdmin.from("profiles").update({
        full_name: data.fullName ?? undefined, email, congregation_id: cong.id,
      }).eq("id", userId);
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
      });
      return { ok: true as const };
    }
  });

export const seedDefaultChecklist = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const defaults = [
      { title: "Cartões S-21", description: "Cartões de publicador atualizados" },
      { title: "Relatório de Contas", description: "Relatório financeiro mensal" },
      { title: "Lista de Candidatos ao Batismo", description: "Nomes e congregações" },
      { title: "Necessidades Locais", description: "Pontos a abordar com o superintendente" },
    ];
    // Insert if not present
    const { data: existing } = await supabaseAdmin.from("checklist_items").select("title").eq("visit_id", data.visitId);
    const existingTitles = new Set((existing ?? []).map((r) => r.title));
    const toInsert = defaults
      .filter((d) => !existingTitles.has(d.title))
      .map((d, i) => ({ visit_id: data.visitId, title: d.title, description: d.description, sort_order: i }));
    if (toInsert.length) await supabaseAdmin.from("checklist_items").insert(toInsert);
    return { ok: true as const };
  });
