// Server fn que permite ao Superintendente desativar (soft-delete) uma linha
// órfã em `schedule_events` que não é mais editável pelo cronograma do
// circuito mas continua aparecendo para o corpo de anciãos / esposa do
// superintendente via guest snapshot. Nenhuma alteração de schema ou RLS:
// apenas UPDATE `is_active=false` autorizado pelas policies existentes
// ("super manages schedule" usa is_superintendent_of).
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
      .update({ is_active: false })
      .eq("id", data.eventId);
    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });
