// Página pública de confirmação de oradores: um link por evento, o PIN aponta a designação.
// Sem login: tudo é validado aqui; só devolve os campos da parte do próprio orador.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashPin, nextSpeakerName, PIN_RE, type InvitePart } from "./invite";
import { isLocked, nextAttemptState } from "./lockout";

const base = z.object({ token: z.string().uuid(), pin: z.string().regex(PIN_RE) });

type Result =
  | { ok: true; part: PublicPart }
  | { ok: false; error: "invalid" | "locked" | "notfound" };

export interface PublicPart {
  event_name: string; event_date: string | null; location: string | null; extra_info: string | null;
  part_time: string | null; duration_min: number | null; theme: string; outline_number: string | null;
  instructions: string | null; part_type_label: string | null; speaker_name: string | null;
  next_speaker: string | null; status: string; responded_at: string | null;
}

async function resolve(token: string, pin: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ev } = await supabaseAdmin.from("circuit_big_events")
    .select("id,name,event_date,location,extra_info,public_token,failed_attempts,locked_until")
    .eq("public_token", token).maybeSingle();
  if (!ev) return { db: supabaseAdmin, error: "notfound" as const };
  if (isLocked(ev.locked_until)) return { db: supabaseAdmin, error: "locked" as const };
  const hash = await hashPin(pin, ev.public_token);
  const { data: parts } = await supabaseAdmin.from("circuit_big_event_parts")
    .select("id,sort_order,part_time,duration_min,theme,outline_number,instructions,part_type_label,assigned_to,speaker_name,show_next_speaker,status,responded_at,pin_hash")
    .eq("event_id", ev.id);
  const part = (parts ?? []).find((p) => p.pin_hash === hash && p.assigned_to === "speaker");
  const next = nextAttemptState(ev, !!part);
  if (next.failed_attempts !== ev.failed_attempts || next.locked_until !== ev.locked_until) {
    await supabaseAdmin.from("circuit_big_events").update(next).eq("id", ev.id);
  }
  if (!part) return { db: supabaseAdmin, error: isLocked(next.locked_until) ? "locked" as const : "invalid" as const };
  const pub: PublicPart = {
    event_name: ev.name, event_date: ev.event_date, location: ev.location, extra_info: ev.extra_info,
    part_time: part.part_time, duration_min: part.duration_min, theme: part.theme, outline_number: part.outline_number,
    instructions: part.instructions, part_type_label: part.part_type_label, speaker_name: part.speaker_name,
    next_speaker: part.show_next_speaker ? nextSpeakerName((parts ?? []) as InvitePart[], part.id) : null,
    status: part.status, responded_at: part.responded_at,
  };
  return { db: supabaseAdmin, partId: part.id, pub };
}

export const getAssignment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => base.parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const r = await resolve(data.token, data.pin);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    return { ok: true, part: r.pub! };
  });

export const respondAssignment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => base.extend({
    action: z.enum(["confirm", "decline"]),
    reason: z.string().trim().max(1000).optional(),
  }).refine((v) => v.action === "confirm" || (v.reason?.length ?? 0) > 0, { message: "reason required" }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const r = await resolve(data.token, data.pin);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    const now = new Date().toISOString();
    const patch = data.action === "confirm"
      ? { status: "confirmed", responded_at: now, decline_reason: null }
      : { status: "declined", responded_at: now, decline_reason: data.reason ?? "" };
    await r.db.from("circuit_big_event_parts").update(patch).eq("id", r.partId!);
    return { ok: true, part: { ...r.pub!, status: patch.status, responded_at: now } };
  });
