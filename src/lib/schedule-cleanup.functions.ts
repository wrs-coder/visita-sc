// Server fn que permite ao Superintendente excluir permanentemente uma linha
// órfã em `schedule_events` que não é mais editável pelo cronograma do
// circuito mas continua aparecendo para o corpo de anciãos / esposa do
// superintendente via guest snapshot. RLS "super deletes ..."/"super manages
// schedule" (usa is_superintendent_of) autoriza o DELETE.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ eventId: z.string().uuid() });

export const deactivateScheduleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", data.eventId);
    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });
