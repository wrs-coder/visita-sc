// Texto do convite (o mesmo para copiar no WhatsApp/e-mail e para o Word) e regras do PIN.

export interface InviteEvent { name: string; event_date: string | null; location: string | null; extra_info: string | null; public_token: string; link_mode?: string | null }
export interface InvitePart {
  id: string; sort_order: number; part_time: string | null; duration_min: number | null; theme: string;
  outline_number: string | null; instructions: string | null; part_type_label: string | null;
  assigned_to: string; speaker_name: string | null; show_next_speaker: boolean;
  speaker_congregation?: string | null; personal_token?: string | null;
}

export const PART_TYPES = ["Discurso", "Entrevistas", "Simpósio", "A Sentinela", "Discurso Batismo", "Discurso Público"] as const;

const withCong = (name: string, cong?: string | null) => (cong?.trim() ? `${name} — ${cong.trim()}` : name);

/** "HH:MM" -> minutos; null se inválido. */
export function toMin(t: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}
export const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Recalcula horários: partes 'auto' começam ao fim da anterior; 'manual' mantêm a hora e servem de nova base. */
export function recomputeTimes<T extends { id: string; sort_order: number; part_time: string | null; duration_min: number | null; time_mode?: string | null }>(start: string | null, parts: T[]): Array<{ id: string; part_time: string | null }> {
  const sorted = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  let cur = toMin(start);
  const out: Array<{ id: string; part_time: string | null }> = [];
  for (const p of sorted) {
    let t: number | null;
    if (p.time_mode === "manual" && toMin(p.part_time) != null) t = toMin(p.part_time);
    else t = cur;
    out.push({ id: p.id, part_time: t == null ? p.part_time : fromMin(t) });
    cur = t == null ? null : t + (p.duration_min ?? 0);
  }
  return out;
}

export const PIN_RE = /^\d{4,6}$/;
export const isValidPin = (pin: string) => PIN_RE.test(pin);

export function generatePin(length = 6, rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < length; i++) s += Math.floor(rand() * 10).toString();
  return s;
}

/** Hash do PIN com o token do evento como sal (mesmo cálculo no app e no servidor). */
export async function hashPin(pin: string, eventToken: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${eventToken}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Orador da próxima parte com orador definido (ignora cânticos e partes sem nome). */
export function nextSpeakerName(parts: InvitePart[], partId: string): string | null {
  const sorted = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  const i = sorted.findIndex((p) => p.id === partId);
  if (i < 0) return null;
  for (const p of sorted.slice(i + 1)) {
    if (p.assigned_to === "none") continue;
    if (p.speaker_name?.trim()) return withCong(p.speaker_name.trim(), p.speaker_congregation);
  }
  return null;
}

export function formatEventDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function inviteLink(origin: string, token: string) { return `${origin}/confirmar/${token}`; }

export function buildInviteText(ev: InviteEvent, part: InvitePart, all: InvitePart[], pin: string | null, origin: string): string {
  const lines: string[] = [];
  lines.push(`${ev.name}${ev.event_date ? ` — ${formatEventDate(ev.event_date)}` : ""}`);
  if (ev.location) lines.push(`Local: ${ev.location}`);
  if (part.speaker_name) lines.push(`Orador: ${withCong(part.speaker_name, part.speaker_congregation)}`);
  const head = [part.outline_number ? `Parte Nº ${part.outline_number}` : part.part_type_label, part.part_time, part.duration_min ? `${part.duration_min} min` : null].filter(Boolean).join(" · ");
  lines.push(`Sua designação: ${head}`);
  if (part.theme) lines.push(`Tema: ${part.theme}`);
  if (part.instructions) lines.push(`Informações para você: ${part.instructions}`);
  if (part.show_next_speaker) {
    const next = nextSpeakerName(all, part.id);
    if (next) lines.push(`Próximo orador: ${next}`);
  }
  if (ev.extra_info) lines.push(`Informações: ${ev.extra_info}`);
  if (ev.link_mode === "personal" && part.personal_token) {
    lines.push(`Confirme aqui: ${inviteLink(origin, part.personal_token)}`);
  } else {
    lines.push(`Confirme aqui: ${inviteLink(origin, ev.public_token)}`);
    if (pin) lines.push(`PIN: ${pin}`);
  }
  return lines.join("\n");
}
