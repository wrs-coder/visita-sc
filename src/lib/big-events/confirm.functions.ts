// Página pública de confirmação de oradores. Dois modos por evento:
// - 'pin': um link por evento, o PIN aponta a designação (com bloqueios).
// - 'personal': cada orador tem seu próprio link (token longo e imprevisível), sem PIN.
// Sem login: tudo é validado aqui; só devolve os campos da parte do próprio orador.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashPin, nextSpeakerName, PIN_RE, type InvitePart } from "./invite";
import { isLocked, nextAttemptState } from "./lockout";

const base = z.object({ token: z.string().uuid(), pin: z.string().regex(PIN_RE).optional() });

type Result =
  | { ok: true; part: PublicPart }
  | { ok: false; error: "invalid" | "locked" | "notfound" | "needpin" };

export interface PublicPart {
  event_name: string; event_date: string | null; location: string | null; extra_info: string | null;
  part_time: string | null; duration_min: number | null; theme: string; outline_number: string | null;
  instructions: string | null; part_type_label: string | null; speaker_name: string | null;
  speaker_congregation: string | null;
  next_speaker: string | null; status: string; responded_at: string | null;
}

const EV_COLS = "id,name,event_date,location,extra_info,public_token,failed_attempts,locked_until,link_mode";
const PART_COLS = "id,sort_order,part_time,duration_min,theme,outline_number,instructions,part_type_label,assigned_to,speaker_name,speaker_congregation,show_next_speaker,status,responded_at,pin_hash,personal_token";

async function resolve(token: string, pin: string | undefined) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin;
  const { data: ev0 } = await db.from("circuit_big_events").select(EV_COLS).eq("public_token", token).maybeSingle();

  let ev = ev0;
  let parts: Array<Record<string, unknown>> | null = null;
  let part: Record<string, unknown> | undefined;

  if (!ev) {
    // Link pessoal: o token é da própria parte.
    const { data: p } = await db.from("circuit_big_event_parts").select(`${PART_COLS},event_id`).eq("personal_token", token).maybeSingle();
    if (!p) return { db, error: "notfound" as const };
    const { data: e } = await db.from("circuit_big_events").select(EV_COLS).eq("id", p.event_id).maybeSingle();
    if (!e || e.link_mode !== "personal" || p.assigned_to !== "speaker") return { db, error: "notfound" as const };
    ev = e;
    const { data: all } = await db.from("circuit_big_event_parts").select(PART_COLS).eq("event_id", e.id);
    parts = all ?? [];
    part = p;
  } else {
    if (ev.link_mode === "personal") return { db, error: "notfound" as const };
    if (isLocked(ev.locked_until)) return { db, error: "locked" as const };
    if (!pin) return { db, error: "needpin" as const };
    const hash = await hashPin(pin, ev.public_token);
    const { data: all } = await db.from("circuit_big_event_parts").select(PART_COLS).eq("event_id", ev.id);
    parts = all ?? [];
    part = parts.find((p) => p.pin_hash === hash && p.assigned_to === "speaker");
    const next = nextAttemptState(ev, !!part);
    if (next.failed_attempts !== ev.failed_attempts || next.locked_until !== ev.locked_until) {
      await db.from("circuit_big_events").update(next).eq("id", ev.id);
    }
    if (!part) return { db, error: isLocked(next.locked_until) ? "locked" as const : "invalid" as const };
  }

  const pp = part as unknown as InvitePart & { status: string; responded_at: string | null };
  const pub: PublicPart = {
    event_name: ev.name, event_date: ev.event_date, location: ev.location, extra_info: ev.extra_info,
    part_time: pp.part_time, duration_min: pp.duration_min, theme: pp.theme, outline_number: pp.outline_number,
    instructions: pp.instructions, part_type_label: pp.part_type_label, speaker_name: pp.speaker_name,
    speaker_congregation: pp.speaker_congregation ?? null,
    next_speaker: pp.show_next_speaker ? nextSpeakerName(parts as unknown as InvitePart[], pp.id) : null,
    status: pp.status, responded_at: pp.responded_at,
  };
  return { db, partId: pp.id, pub };
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
