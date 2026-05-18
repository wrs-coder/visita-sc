// Wrapper sobre useMutation que envia direto quando online, ou enfileira
// a operação para sincronização posterior quando offline.
//
// SEGURANÇA: para garantir que payloads enfileirados não sejam enviados
// para a congregação errada (importante quando um SC alterna entre
// congregações via o seletor no header), `congregation_id` é injetado
// automaticamente em inserts a partir da congregação ativa no momento
// em que a mutação é DISPARADA — não no momento do flush.
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useActiveCongregation } from "./use-active-congregation";
import { useAuth } from "./use-auth";
import { enqueue, type QueuedMutation } from "@/lib/offline-queue";
import { supabase } from "@/integrations/supabase/client";

type OfflineWrite = Omit<QueuedMutation, "id" | "createdAt">;

// Tabelas onde devemos injetar congregation_id automaticamente em inserts.
const TABLES_WITH_CONGREGATION_ID = new Set([
  "congregations",
  "visits",
  "checklist_templates",
  "field_meeting_templates",
  "program_templates",
  "profiles",
  "user_roles",
]);

// Tabelas com superintendent_id (para inserts feitos pelo SC).
const TABLES_WITH_SUPERINTENDENT_ID = new Set([
  "congregations",
  "checklist_templates",
  "field_meeting_templates",
  "program_templates",
  "private_notes",
]);

function enrichPayload(
  vars: OfflineWrite,
  ctx: { congregationId: string | null; userId: string | null },
): OfflineWrite {
  if (vars.op !== "insert" && vars.op !== "upsert") return vars;
  if (!vars.payload) return vars;

  const apply = (row: Record<string, unknown>) => {
    const out = { ...row };
    if (
      TABLES_WITH_CONGREGATION_ID.has(vars.table) &&
      ctx.congregationId &&
      out.congregation_id == null
    ) {
      out.congregation_id = ctx.congregationId;
    }
    if (
      TABLES_WITH_SUPERINTENDENT_ID.has(vars.table) &&
      ctx.userId &&
      out.superintendent_id == null
    ) {
      out.superintendent_id = ctx.userId;
    }
    return out;
  };

  const payload = Array.isArray(vars.payload)
    ? vars.payload.map(apply)
    : apply(vars.payload as Record<string, unknown>);
  return { ...vars, payload };
}

export function useOfflineMutation<TVars extends OfflineWrite>(
  options?: Omit<UseMutationOptions<{ queued: boolean }, Error, TVars>, "mutationFn">,
) {
  const congregation = useActiveCongregation();
  const { user } = useAuth();
  const ctx = { congregationId: congregation?.id ?? null, userId: user?.id ?? null };

  return useMutation<{ queued: boolean }, Error, TVars>({
    ...options,
    mutationFn: async (raw) => {
      const vars = enrichPayload(raw, ctx) as TVars;
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (isOffline) {
        enqueue(vars);
        return { queued: true };
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ref: any = supabase.from(vars.table as never);
        let res;
        if (vars.op === "insert") res = await ref.insert(vars.payload);
        else if (vars.op === "upsert") res = await ref.upsert(vars.payload);
        else if (vars.op === "update") {
          let q = ref.update(vars.payload);
          for (const [k, v] of Object.entries(vars.match ?? {})) q = q.eq(k, v);
          res = await q;
        } else if (vars.op === "delete") {
          let q = ref.delete();
          for (const [k, v] of Object.entries(vars.match ?? {})) q = q.eq(k, v);
          res = await q;
        }
        if (res?.error) throw res.error;
        return { queued: false };
      } catch (err) {
        // Falha de rede → enfileira para retry transparente.
        // Erros de validação/RLS também caem aqui; deixamos na fila para que o
        // usuário veja o problema na próxima sync e o RLS continue sendo o
        // guarda-final no servidor.
        console.warn("[useOfflineMutation] falha — enfileirando", vars, err);
        enqueue(vars);
        return { queued: true };
      }
    },
  });
}
