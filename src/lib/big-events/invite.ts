// Texto do convite (o mesmo para copiar no WhatsApp/e-mail e para o Word) e regras do PIN.

export interface InviteEvent { name: string; event_date: string | null; location: string | null; extra_info: string | null; public_token: string }
export interface InvitePart {
  id: string; sort_order: number; part_time: string | null; duration_min: number | null; theme: string;
  outline_number: string | null; instructions: string | null; part_type_label: string | null;
  assigned_to: string; speaker_name: string | null; show_next_speaker: boolean;
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
    if (p.speaker_name?.trim()) return p.speaker_name.trim();
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
  if (part.speaker_name) lines.push(`Orador: ${part.speaker_name}`);
  const head = [part.outline_number ? `Parte Nº ${part.outline_number}` : part.part_type_label, part.part_time, part.duration_min ? `${part.duration_min} min` : null].filter(Boolean).join(" · ");
  lines.push(`Sua designação: ${head}`);
  if (part.theme) lines.push(`Tema: ${part.theme}`);
  if (part.instructions) lines.push(`Instruções: ${part.instructions}`);
  if (part.show_next_speaker) {
    const next = nextSpeakerName(all, part.id);
    if (next) lines.push(`Próximo orador: ${next}`);
  }
  if (ev.extra_info) lines.push(`Informações: ${ev.extra_info}`);
  lines.push(`Confirme aqui: ${inviteLink(origin, ev.public_token)}`);
  if (pin) lines.push(`PIN: ${pin}`);
  return lines.join("\n");
}
