// Wrapper sobre useMutation que envia direto quando online, ou enfileira
// a operação para sincronização posterior quando offline.
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { enqueue, type QueuedMutation } from "@/lib/offline-queue";
import { supabase } from "@/integrations/supabase/client";

type OfflineWrite = Omit<QueuedMutation, "id" | "createdAt">;

export function useOfflineMutation<TVars extends OfflineWrite>(
  options?: Omit<UseMutationOptions<{ queued: boolean }, Error, TVars>, "mutationFn">,
) {
  return useMutation<{ queued: boolean }, Error, TVars>({
    ...options,
    mutationFn: async (vars) => {
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
        enqueue(vars);
        return { queued: true };
      }
    },
  });
}
