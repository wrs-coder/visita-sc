import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/);
const payloadSchema = z.record(z.string(), z.unknown());

export const getElderAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, loadAgenda } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (!role) return { ok: false as const, error: "Sem acesso a esta pauta." };
    return (await loadAgenda(data.visitId, role)) ?? { ok: false as const, error: "Visita não encontrada." };
  });

export const saveElderAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid(), payload: payloadSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, saveAgenda } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (!role) return { ok: false as const, error: "Sem acesso a esta pauta." };
    const updatedAt = await saveAgenda(data.visitId, role, data.payload);
    if (updatedAt === "locked") return { ok: false as const, error: "O prazo para preencher a pauta já terminou." };
    return updatedAt ? { ok: true as const, updatedAt } : { ok: false as const, error: "Visita não encontrada." };
  });

/** Acesso "Corpo de anciãos" (sem cadastro): o código da congregação libera só os campos marcados "Todos". */
export const guestGetElderAgenda = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: codeSchema }).parse(input))
  .handler(async ({ data }) => {
    const { visitForInvite, loadAgenda } = await import("./elder-agenda/agenda.server");
    const visitId = await visitForInvite(data.inviteCode);
    if (!visitId) return { ok: false as const, error: "Nenhuma visita ativa." };
    return (await loadAgenda(visitId, "elder")) ?? { ok: false as const, error: "Visita não encontrada." };
  });

export const guestSaveElderAgenda = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: codeSchema, payload: payloadSchema }).parse(input))
  .handler(async ({ data }) => {
    const { visitForInvite, saveAgenda } = await import("./elder-agenda/agenda.server");
    const visitId = await visitForInvite(data.inviteCode);
    if (!visitId) return { ok: false as const, error: "Nenhuma visita ativa." };
    const updatedAt = await saveAgenda(visitId, "elder", data.payload);
    if (updatedAt === "locked") return { ok: false as const, error: "O prazo para preencher a pauta já terminou." };
    return updatedAt ? { ok: true as const, updatedAt } : { ok: false as const, error: "Visita não encontrada." };
  });
