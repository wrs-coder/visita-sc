import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_CODE = "152832";

export function elderEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `elder-${digits}@visita-sc.local`;
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
    await supabaseAdmin.from("profiles").update({ full_name: data.fullName, email: data.email }).eq("id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "superintendent", congregation_id: null });
    return { ok: true as const };
  });

const ELDER_POSITIONS = ["coordenador", "secretario", "sup_servico", "corpo"] as const;
const ELDER_REGISTERABLE_POSITIONS = ["coordenador", "secretario", "sup_servico"] as const;

export const registerElderByPhone = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(8).max(20),
      email: z.string().trim().email().max(200),
      password: z.string().min(6).max(100),
      inviteCode: z.string().trim().min(4).max(20),
      position: z.enum(ELDER_REGISTERABLE_POSITIONS),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 8) return { ok: false as const, error: "Telefone inválido." };
    const email = data.email.toLowerCase();

    const code = data.inviteCode.toUpperCase();
    const { data: cong, error: cErr } = await supabaseAdmin
      .from("congregations").select("id,is_active").eq("invite_code", code).maybeSingle();
    if (cErr) return { ok: false as const, error: cErr.message };
    if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
    if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa. Fale com o superintendente." };

    // Phone uniqueness
    const { data: existingPhone } = await supabaseAdmin
      .from("profiles").select("id").eq("phone", digits).maybeSingle();
    if (existingPhone) return { ok: false as const, error: "Já existe um cadastro com este telefone." };

    const { data: created, error: signErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: digits },
    });
    if (signErr || !created.user) {
      return { ok: false as const, error: signErr?.message ?? "Falha ao criar conta." };
    }
    const userId = created.user.id;

    await supabaseAdmin.from("profiles").update({
      full_name: data.fullName, email, phone: digits, congregation_id: cong.id,
    }).eq("id", userId);

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
    });

    return { ok: true as const, email };
  });

// Resolve phone -> email for sign-in (returns synthesized email if phone exists)
export const resolveElderEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: z.string().min(4).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 8) return { ok: false as const, error: "Telefone inválido." };
    const { data: p } = await supabaseAdmin.from("profiles").select("id,email").eq("phone", digits).maybeSingle();
    if (!p) return { ok: false as const, error: "Telefone não cadastrado." };
    return { ok: true as const, email: p.email ?? elderEmailFromPhone(digits) };
  });

// Super resets an elder's password (for an elder in one of his congregations)
export const resetElderPasswordBySuper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      elderUserId: z.string().uuid(),
      newPassword: z.string().min(6).max(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Verify caller is super and elder is in one of their congregations
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("congregation_id").eq("user_id", data.elderUserId).eq("role", "elder").maybeSingle();
    if (!role?.congregation_id) return { ok: false as const, error: "Ancião não encontrado." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", role.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.elderUserId, { password: data.newPassword });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// List elders in super's congregations (for the password-reset UI)
export const listMyElders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: congs } = await supabaseAdmin.from("congregations").select("id,name").eq("superintendent_id", userId);
    if (!congs || congs.length === 0) return { ok: true as const, data: [] };
    const congIds = congs.map((c) => c.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id,congregation_id,elder_position")
      .eq("role", "elder").in("congregation_id", congIds);
    if (!roles) return { ok: true as const, data: [] };
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id,full_name,phone").in("id", userIds);
    const congMap = new Map(congs.map((c) => [c.id, c.name]));
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      ok: true as const,
      data: roles.map((r) => {
        const p = profMap.get(r.user_id);
        return {
          user_id: r.user_id,
          full_name: p?.full_name ?? "—",
          phone: p?.phone ?? "",
          congregation_id: r.congregation_id,
          congregation_name: r.congregation_id ? congMap.get(r.congregation_id) ?? "—" : "—",
          elder_position: r.elder_position,
        };
      }),
    };
  });

// Backwards-compat: kept (now unused by the elder signup UI) for any older flow
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
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("id,is_active").eq("invite_code", data.inviteCode.toUpperCase()).maybeSingle();
    if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
    if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa." };
    const { data: created, error: signErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (signErr || !created.user) return { ok: false as const, error: signErr?.message ?? "Falha ao criar conta." };
    await supabaseAdmin.from("profiles").update({
      full_name: data.fullName, email: data.email, congregation_id: cong.id,
    }).eq("id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id, role: "elder", congregation_id: cong.id, elder_position: data.position,
    });
    return { ok: true as const };
  });

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
      await supabaseAdmin.from("profiles").update({ full_name: data.fullName ?? undefined, email }).eq("id", userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "superintendent", congregation_id: null });
      return { ok: true as const };
    } else {
      if (!data.position) return { ok: false as const, error: "Selecione sua designação." };
      const { data: cong } = await supabaseAdmin.from("congregations")
        .select("id,is_active").eq("invite_code", data.code.toUpperCase()).maybeSingle();
      if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
      if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa." };
      await supabaseAdmin.from("profiles").update({ full_name: data.fullName ?? undefined, email, congregation_id: cong.id }).eq("id", userId);
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
      });
      return { ok: true as const };
    }
  });
