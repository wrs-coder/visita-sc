import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Código de cadastro de superintendente — lido APENAS do secret em runtime.
// Sem fallback hardcoded: se o secret não estiver configurado, o cadastro
// recusa todas as tentativas (fail-closed) em vez de aceitar um valor
// público conhecido no histórico do repositório.
const getSuperCode = () => process.env.SUPER_REGISTRATION_CODE ?? "";

export function elderEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `elder-${digits}@visita-sc.local`;
}

export function syntheticEmailFromUsername(username: string) {
  return `usr-${username.trim().toLowerCase()}@visita-sc.local`;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;
const SYNTHETIC_EMAIL_REGEX = /@visita-sc\.local$/i;


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
    if (data.code !== getSuperCode()) {
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
    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.fullName, email: data.email }, { onConflict: "id" });
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "superintendent").maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "superintendent", congregation_id: null });
    }
    return { ok: true as const };
  });

const ELDER_REGISTERABLE_POSITIONS = ["coordenador", "secretario", "sup_servico"] as const;

// Returns which of the 3 registerable positions are still available for a congregation code.
// SECURITY: never returns the list of taken positions to avoid leaking org structure
// to unauthenticated callers.
export const getAvailableElderPositions = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: z.string().trim().min(1).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const code = data.inviteCode.toUpperCase();
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("id,is_active").eq("invite_code", code).maybeSingle();
    if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
    if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa. Fale com o superintendente." };
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("elder_position")
      .eq("role", "elder").eq("congregation_id", cong.id)
      .in("elder_position", [...ELDER_REGISTERABLE_POSITIONS]);
    const taken = new Set((roles ?? []).map((r) => r.elder_position).filter(Boolean) as string[]);
    const available = ELDER_REGISTERABLE_POSITIONS.filter((p) => !taken.has(p));
    return { ok: true as const, available };
  });

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

    // Position availability (one Coordenador / Secretário / Sup. Serviço per congregação)
    const { data: takenRoles } = await supabaseAdmin
      .from("user_roles").select("elder_position")
      .eq("role", "elder").eq("congregation_id", cong.id)
      .in("elder_position", [...ELDER_REGISTERABLE_POSITIONS]);
    const takenSet = new Set((takenRoles ?? []).map((r) => r.elder_position).filter(Boolean) as string[]);
    if (takenSet.has(data.position)) {
      return { ok: false as const, error: "Esta função já está cadastrada para esta congregação." };
    }

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

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
    });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      const msg = /duplicate key|unique/i.test(rErr.message)
        ? "Esta função já está cadastrada para esta congregação."
        : rErr.message;
      return { ok: false as const, error: msg };
    }

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
    const { data: congs } = await supabaseAdmin
      .from("congregations")
      .select("id,name,elder_tab_password_plain,elder_tab_password_created_by")
      .eq("superintendent_id", userId);
    if (!congs || congs.length === 0) return { ok: true as const, data: [] };
    const congIds = congs.map((c) => c.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id,congregation_id,elder_position")
      .eq("role", "elder").in("congregation_id", congIds);
    if (!roles) return { ok: true as const, data: [] };
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id,full_name,phone,email,username").in("id", userIds);
    const congMap = new Map(congs.map((c) => [c.id, c]));
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      ok: true as const,
      data: roles.map((r) => {
        const p = profMap.get(r.user_id);
        const c = r.congregation_id ? congMap.get(r.congregation_id) : null;
        const isCreator = !!c && c.elder_tab_password_created_by === r.user_id;
        const rawEmail = p?.email ?? null;
        const email = rawEmail && !SYNTHETIC_EMAIL_REGEX.test(rawEmail) ? rawEmail : null;
        return {
          user_id: r.user_id,
          full_name: p?.full_name ?? "—",
          phone: p?.phone ?? "",
          email,
          username: p?.username ?? null,
          congregation_id: r.congregation_id,
          congregation_name: c?.name ?? "—",
          elder_position: r.elder_position,
          // Senha da aba "Anciãos" criada por este ancião (somente o superintendente
          // recebe esses dados — ele é o único caller autorizado de listMyElders).
          elder_tab_password_is_creator: isCreator,
          elder_tab_password: isCreator ? c?.elder_tab_password_plain ?? null : null,
        };
      }),
    };
  });


// Super updates an elder's profile (name, phone, position) for elders in their congregations
export const updateElderBySuper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      elderUserId: z.string().uuid(),
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(8).max(20),
      position: z.enum(ELDER_REGISTERABLE_POSITIONS),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("id,congregation_id").eq("user_id", data.elderUserId).eq("role", "elder").maybeSingle();
    if (!role?.congregation_id) return { ok: false as const, error: "Ancião não encontrado." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", role.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const digits = data.phone.replace(/\D/g, "");
    const { data: existingPhone } = await supabaseAdmin
      .from("profiles").select("id").eq("phone", digits).neq("id", data.elderUserId).maybeSingle();
    if (existingPhone) return { ok: false as const, error: "Já existe um cadastro com este telefone." };
    const { error: pErr } = await supabaseAdmin.from("profiles")
      .update({ full_name: data.fullName, phone: digits }).eq("id", data.elderUserId);
    if (pErr) return { ok: false as const, error: pErr.message };
    const { error: rErr } = await supabaseAdmin.from("user_roles")
      .update({ elder_position: data.position }).eq("id", role.id);
    if (rErr) return { ok: false as const, error: rErr.message };
    return { ok: true as const };
  });

// Super deletes an elder account (only if elder belongs to one of their congregations)
export const deleteElderBySuper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ elderUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("congregation_id").eq("user_id", data.elderUserId).eq("role", "elder").maybeSingle();
    if (!role?.congregation_id) return { ok: false as const, error: "Ancião não encontrado." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", role.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.elderUserId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// DEPRECATED — kept only as a no-op for backwards-compat. The previous version
// accepted `position: 'corpo'` for self-service registration, which the security
// model forbids (corpo é assignável apenas pelo SC). Use `registerElderByPhone`
// ou `linkAccount` (mode "elder") em vez deste endpoint.
export const registerElder = createServerFn({ method: "POST" })
  .handler(async () => {
    return { ok: false as const, error: "Endpoint descontinuado. Use o fluxo de cadastro atual." };
  });

export const linkAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      mode: z.enum(["superintendent", "elder"]),
      code: z.string().trim().min(1),
      fullName: z.string().trim().min(1).max(120).optional(),
      // Elder self-onboarding só permite posições registráveis (exclui 'corpo').
      position: z.enum(ELDER_REGISTERABLE_POSITIONS).optional(),
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
      if (data.code !== getSuperCode()) return { ok: false as const, error: "Código de superintendente inválido." };
      await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.fullName ?? undefined, email }, { onConflict: "id" });
      const { data: existing } = await supabaseAdmin
        .from("user_roles").select("id").eq("user_id", userId).eq("role", "superintendent").maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "superintendent", congregation_id: null });
      }
      return { ok: true as const };
    } else {
      if (!data.position) return { ok: false as const, error: "Selecione sua designação." };
      const { data: cong } = await supabaseAdmin.from("congregations")
        .select("id,is_active").eq("invite_code", data.code.toUpperCase()).maybeSingle();
      if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
      if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa." };

      // Garantir que a posição ainda está disponível (uma de cada por congregação)
      const { data: takenRoles } = await supabaseAdmin
        .from("user_roles").select("elder_position")
        .eq("role", "elder").eq("congregation_id", cong.id)
        .in("elder_position", [...ELDER_REGISTERABLE_POSITIONS]);
      const taken = new Set((takenRoles ?? []).map((r) => r.elder_position).filter(Boolean) as string[]);
      if (taken.has(data.position)) {
        return { ok: false as const, error: "Esta função já está cadastrada para esta congregação." };
      }

      await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.fullName ?? undefined, email, congregation_id: cong.id }, { onConflict: "id" });
      const { data: existing } = await supabaseAdmin
        .from("user_roles").select("id").eq("user_id", userId).eq("role", "elder").maybeSingle();
      if (existing) {
        await supabaseAdmin.from("user_roles").update({ congregation_id: cong.id, elder_position: data.position }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("user_roles").insert({
          user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
        });
      }
      return { ok: true as const };
    }
  });

// =====================================================================
// Username-based flow (no email required for elders)
// =====================================================================

// Elder signup with only username + phone + invite + password (no email, no full name).
// full_name and email may be filled later in profile.
export const registerElderByUsername = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      username: z.string().trim().regex(USERNAME_REGEX, "Use 3–30 letras, números, _ . ou -"),
      phone: z.string().trim().min(8).max(20),
      password: z.string().min(6).max(100),
      inviteCode: z.string().trim().min(4).max(20),
      position: z.enum(ELDER_REGISTERABLE_POSITIONS),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 8) return { ok: false as const, error: "Telefone inválido." };

    const code = data.inviteCode.toUpperCase();
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("id,is_active").eq("invite_code", code).maybeSingle();
    if (!cong) return { ok: false as const, error: "Código de congregação inválido." };
    if (!cong.is_active) return { ok: false as const, error: "Esta congregação está inativa." };

    // Position availability
    const { data: takenRoles } = await supabaseAdmin
      .from("user_roles").select("elder_position")
      .eq("role", "elder").eq("congregation_id", cong.id)
      .in("elder_position", [...ELDER_REGISTERABLE_POSITIONS]);
    const takenSet = new Set((takenRoles ?? []).map((r) => r.elder_position).filter(Boolean) as string[]);
    if (takenSet.has(data.position)) {
      return { ok: false as const, error: "Esta função já está cadastrada para esta congregação." };
    }

    // Uniqueness: username + phone
    const { data: existingUser } = await supabaseAdmin
      .from("profiles").select("id").ilike("username", username).maybeSingle();
    if (existingUser) return { ok: false as const, error: "Nome de utilizador já está em uso." };
    const { data: existingPhone } = await supabaseAdmin
      .from("profiles").select("id").eq("phone", digits).maybeSingle();
    if (existingPhone) return { ok: false as const, error: "Já existe um cadastro com este telefone." };

    const syntheticEmail = syntheticEmailFromUsername(username);
    const { data: created, error: signErr } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: { username, phone: digits },
    });
    if (signErr || !created.user) {
      return { ok: false as const, error: signErr?.message ?? "Falha ao criar conta." };
    }
    const userId = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      username,
      phone: digits,
      email: null,
      full_name: null,
      congregation_id: cong.id,
    }, { onConflict: "id" });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: pErr.message };
    }

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: "elder", congregation_id: cong.id, elder_position: data.position,
    });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: rErr.message };
    }

    return { ok: true as const, email: syntheticEmail };
  });

// Unified login resolver: accepts username, email, or circuit identifier.
// Returns the (real or synthetic) auth email to pass to signInWithPassword.
export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ identifier: z.string().trim().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const id = data.identifier.trim();
    if (!id) return { ok: false as const, error: "Informe o utilizador." };

    // 1) Direct email match
    if (id.includes("@")) {
      const lower = id.toLowerCase();
      const { data: byEmail } = await supabaseAdmin
        .from("profiles").select("id,email").ilike("email", lower).maybeSingle();
      if (byEmail?.email) return { ok: true as const, email: byEmail.email };
      return { ok: false as const, error: "E-mail não cadastrado." };
    }

    // 2) Phone match — qualquer entrada sem "@" cujos dígitos (após remover
    // não-dígitos) totalizem 8+ é candidata a telefone. Aceita "+55 71 98342-0366",
    // "71 98342-0366", "71983420366", etc. — o cadastro já normaliza `phone` em dígitos.
    const digits = id.replace(/\D/g, "");
    if (digits.length >= 8) {
      const { data: byPhone } = await supabaseAdmin
        .from("profiles").select("id,email,username,phone").eq("phone", digits).maybeSingle();
      if (byPhone) {
        if (byPhone.email && !SYNTHETIC_EMAIL_REGEX.test(byPhone.email)) {
          return { ok: true as const, email: byPhone.email };
        }
        if (byPhone.username) return { ok: true as const, email: syntheticEmailFromUsername(byPhone.username) };
        if (byPhone.email) return { ok: true as const, email: byPhone.email };
      }
    }

    // 3) Username match (works for any user)
    const { data: byUser } = await supabaseAdmin
      .from("profiles").select("id,email,username").ilike("username", id).maybeSingle();
    if (byUser) {
      if (byUser.email && !SYNTHETIC_EMAIL_REGEX.test(byUser.email)) return { ok: true as const, email: byUser.email };
      if (byUser.username) return { ok: true as const, email: syntheticEmailFromUsername(byUser.username) };
      if (byUser.email) return { ok: true as const, email: byUser.email };
    }


    // 4) Circuit identifier (super only)
    const { data: byCircuit } = await supabaseAdmin
      .from("profiles").select("id,email,username").ilike("circuit", id).maybeSingle();
    if (byCircuit) {
      // Confirm it's a super
      const { data: role } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", byCircuit.id).eq("role", "superintendent").maybeSingle();
      if (role) {
        if (byCircuit.email) return { ok: true as const, email: byCircuit.email };
        if (byCircuit.username) return { ok: true as const, email: syntheticEmailFromUsername(byCircuit.username) };
      }
    }

    return { ok: false as const, error: "Utilizador não encontrado." };
  });

// Returns whether the user identified by `identifier` has a real recoverable email.
// If `ok: false` with `reason: "no_email"`, the UI should tell the elder to ask the
// superintendent to reset their password manually.
export const lookupRecoverableEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ identifier: z.string().trim().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const id = data.identifier.trim();
    let email: string | null = null;
    if (id.includes("@")) {
      const { data: row } = await supabaseAdmin.from("profiles").select("email").ilike("email", id.toLowerCase()).maybeSingle();
      email = row?.email ?? null;
    } else {
      const { data: row } = await supabaseAdmin.from("profiles").select("email").ilike("username", id).maybeSingle();
      email = row?.email ?? null;
      if (!email) {
        const { data: row2 } = await supabaseAdmin.from("profiles").select("email").ilike("circuit", id).maybeSingle();
        email = row2?.email ?? null;
      }
    }
    if (!email || SYNTHETIC_EMAIL_REGEX.test(email)) {
      return { ok: false as const, reason: "no_email" as const };
    }
    return { ok: true as const, email };
  });

