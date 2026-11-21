import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/);
const secretSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/).optional();
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
  .inputValidator((input) => z.object({ visitId: z.string().uuid(), payload: payloadSchema, authorSecret: secretSchema, knownResponseIds: z.array(z.string().max(100)).max(1000).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, saveAgenda } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (!role) return { ok: false as const, error: "Sem acesso a esta pauta." };
    const updatedAt = await saveAgenda(data.visitId, role, data.payload, data.authorSecret, data.knownResponseIds);
    if (updatedAt === "locked") return { ok: false as const, error: "O prazo para preencher a pauta já terminou." };
    return updatedAt ? { ok: true as const, updatedAt } : { ok: false as const, error: "Visita não encontrada." };
  });

export const scPublishElderAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, publishAgenda } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (role !== "sc") return { ok: false as const, error: "Só o superintendente envia a pauta." };
    const publishedAt = await publishAgenda(data.visitId);
    return publishedAt ? { ok: true as const, publishedAt } : { ok: false as const, error: "Salve a pauta antes de enviar." };
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
  .inputValidator((input) => z.object({ inviteCode: codeSchema, payload: payloadSchema, authorSecret: secretSchema }).parse(input))
  .handler(async ({ data }) => {
    const { visitForInvite, saveAgenda } = await import("./elder-agenda/agenda.server");
    const visitId = await visitForInvite(data.inviteCode);
    if (!visitId) return { ok: false as const, error: "Nenhuma visita ativa." };
    const updatedAt = await saveAgenda(visitId, "elder", data.payload, data.authorSecret);
    if (updatedAt === "locked") return { ok: false as const, error: "O prazo para preencher a pauta já terminou." };
    return updatedAt ? { ok: true as const, updatedAt } : { ok: false as const, error: "Visita não encontrada." };
  });

// ---- Anexos da pauta (foto/PDF enviados pelo SC; o resto fica só no aparelho) ----
const pathSchema = z.string().max(200).regex(/^[0-9a-f-]{36}\/[\w-]{1,64}\.(jpg|pdf)$/);

export const scAttachmentUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid(), ext: z.enum(["jpg", "pdf"]), size: z.number().int().positive(), currentCount: z.number().int().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, AGENDA_BUCKET } = await import("./elder-agenda/agenda.server");
    const { MAX_CLOUD_ATTACHMENTS, MAX_CLOUD_BYTES } = await import("./elder-agenda/agenda");
    if ((await roleForUser(context.userId, data.visitId)) !== "sc") return { ok: false as const, error: "Só o superintendente envia anexos." };
    if (data.size > MAX_CLOUD_BYTES) return { ok: false as const, error: "O arquivo passa de 5 MB." };
    if (data.currentCount >= MAX_CLOUD_ATTACHMENTS) return { ok: false as const, error: `Limite de ${MAX_CLOUD_ATTACHMENTS} anexos enviados por pauta.` };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.visitId}/${crypto.randomUUID().replace(/-/g, "")}.${data.ext}`;
    const { data: up, error } = await supabaseAdmin.storage.from(AGENDA_BUCKET).createSignedUploadUrl(path);
    if (error || !up) return { ok: false as const, error: "Não foi possível preparar o envio." };
    return { ok: true as const, path, token: up.token };
  });

export const scDeleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid(), path: pathSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, AGENDA_BUCKET } = await import("./elder-agenda/agenda.server");
    if ((await roleForUser(context.userId, data.visitId)) !== "sc" || !data.path.startsWith(`${data.visitId}/`)) return { ok: false as const };
    // Ainda na versão enviada aos anciãos: o arquivo fica até o próximo envio.
    const { savedPayload } = await import("./elder-agenda/agenda.server");
    const sent = await savedPayload(data.visitId, true);
    if (sent?.blocks.some((b) => b.cards.some((c) => c.attachments.some((x) => x.cloudPath === data.path)))) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(AGENDA_BUCKET).remove([data.path]);
    return { ok: true as const };
  });

export const getAgendaAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid(), path: pathSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, attachmentVisible, signedAttachmentUrl } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (!role || !(await attachmentVisible(data.visitId, data.path, role))) return { ok: false as const, error: "Anexo indisponível." };
    const url = await signedAttachmentUrl(data.path);
    return url ? { ok: true as const, url } : { ok: false as const, error: "Anexo indisponível." };
  });

export const guestGetAgendaAttachmentUrl = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ inviteCode: codeSchema, path: pathSchema }).parse(input))
  .handler(async ({ data }) => {
    const { visitForInvite, attachmentVisible, signedAttachmentUrl } = await import("./elder-agenda/agenda.server");
    const visitId = await visitForInvite(data.inviteCode);
    if (!visitId || !(await attachmentVisible(visitId, data.path, "elder"))) return { ok: false as const, error: "Anexo indisponível." };
    const url = await signedAttachmentUrl(data.path);
    return url ? { ok: true as const, url } : { ok: false as const, error: "Anexo indisponível." };
  });

/** "Finalizar a visita": só o SC apaga a pauta e todos os anexos da visita na nuvem. Chamar antes de apagar a visita. */
export const scPurgeElderAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { roleForUser, purgeAgenda } = await import("./elder-agenda/agenda.server");
    const role = await roleForUser(context.userId, data.visitId);
    if (role === null) {
      // Visita já apagada: nada a limpar (a pauta sai junto com a visita). Visita de outro SC: recusa.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: v } = await supabaseAdmin.from("visits").select("id").eq("id", data.visitId).maybeSingle();
      return v ? { ok: false as const, error: "Só o superintendente apaga a pauta." } : { ok: true as const, files: 0 };
    }
    if (role !== "sc") return { ok: false as const, error: "Só o superintendente apaga a pauta." };
    try {
      const r = await purgeAgenda(data.visitId);
      return { ok: true as const, files: r.files };
    } catch (e) {
      console.error("[scPurgeElderAgenda]", e);
      return { ok: false as const, error: "Não foi possível apagar a pauta da reunião com os anciãos." };
    }
  });
