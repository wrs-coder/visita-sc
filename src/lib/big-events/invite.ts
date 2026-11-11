// Texto do convite (o mesmo para copiar no WhatsApp/e-mail e para o Word) e regras do PIN.

export interface InviteEvent { name: string; event_date: string | null; location: string | null; extra_info: string | null; public_token: string; public_code?: string | null; link_mode?: string | null }
export interface InvitePart {
  id: string; sort_order: number; part_time: string | null; duration_min: number | null; theme: string;
  outline_number: string | null; instructions: string | null; part_type_label: string | null;
  assigned_to: string; speaker_name: string | null; show_next_speaker: boolean;
  speaker_congregation?: string | null; personal_token?: string | null; personal_code?: string | null;
  talk_includes?: unknown;
}

export const PART_TYPES = ["Discurso", "Entrevistas", "Simpósio", "A Sentinela", "Discurso Batismo", "Discurso Público", "Oração", "Presidência do programa"] as const;
/** Nome mostrado para cada "Designado" (o valor gravado não muda). */
export const ASSIGNED_LABEL: Record<string, string> = { speaker: "Ancião", co: "SC", branch: "Rep. da Filial", none: "—" };
const FLOATING = new Set(["Oração", "Presidência do programa"]);

// ---------- Participações adicionais (guardadas em talk_includes como marcadores) ----------
export const PART_EXTRAS = [
  { id: "demo", label: "Demonstração" }, { id: "videos", label: "Vídeos" },
  { id: "entrevista", label: "Entrevista" }, { id: "assistencia", label: "Participação da Assistência" },
] as const;
const EXTRA_PREFIX = "@extra:";
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export function readExtras(includes: unknown): string[] {
  const ids = strList(includes).filter((x) => x.startsWith(EXTRA_PREFIX)).map((x) => x.slice(EXTRA_PREFIX.length));
  return PART_EXTRAS.map((e) => e.id).filter((id) => ids.includes(id));
}
/** "inclui" do programa sem os marcadores internos. */
export const plainIncludes = (includes: unknown) => strList(includes).filter((x) => !x.startsWith(EXTRA_PREFIX));
export const withExtras = (includes: unknown, ids: string[]) => [...plainIncludes(includes), ...PART_EXTRAS.filter((e) => ids.includes(e.id)).map((e) => EXTRA_PREFIX + e.id)];
export function extrasLabel(includes: unknown): string | null {
  const ids = readExtras(includes);
  return ids.length ? PART_EXTRAS.filter((e) => ids.includes(e.id)).map((e) => e.label).join(" · ") : null;
}

/** Participações só valem para partes com orador; Presidente e Oração nunca têm. */
export function partExtrasLabel(p: { talk_includes?: unknown; part_type_label?: string | null }): string | null {
  return p.part_type_label === "Oração" || p.part_type_label === "Presidência do programa" ? null : extrasLabel(p.talk_includes);
}
const withCong = (name: string, cong?: string | null) => (cong?.trim() ? `${name} — ${cong.trim()}` : name);

/** "HH:MM" -> minutos; null se inválido. */
export function toMin(t: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}
export const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Avanço até a próxima parte: 9, 14, 19… min ganham 1 min de transição (fecha múltiplo de 5). */
export const advanceMin = (dur: number | null | undefined) => { const d = dur ?? 0; return d > 0 && d % 5 === 4 ? d + 1 : d; };

/** Recalcula horários: partes 'auto' começam ao fim da anterior; 'manual' mantêm a hora e servem de nova base. */
export function recomputeTimes<T extends { id: string; sort_order: number; part_time: string | null; duration_min: number | null; time_mode?: string | null; part_type_label?: string | null; part_type_id?: string | null }>(start: string | null, parts: T[]): Array<{ id: string; part_time: string | null }> {
  const sorted = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  let cur = toMin(start);
  let series: number | null = null; // relógio dos discursos da série (não move o programa)
  const out: Array<{ id: string; part_time: string | null }> = [];
  for (const p of sorted) {
    let t: number | null;
    if (p.part_type_id === "SeriesItem") {
      t = series ?? cur;
      out.push({ id: p.id, part_time: t == null ? p.part_time : fromMin(t) });
      if (t != null) series = t + (p.duration_min ?? 0);
      continue;
    }
    if (p.time_mode === "manual" && toMin(p.part_time) != null) t = toMin(p.part_time);
    else t = cur;
    series = p.part_type_id === "SeriesHead" ? t : null;
    out.push({ id: p.id, part_time: t == null ? p.part_time : fromMin(t) });
    if (FLOATING.has(p.part_type_label ?? "")) continue; // Oração/Presidente não empurram o programa
    cur = t == null ? null : t + advanceMin(p.duration_min);
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

/** Links de convite sempre usam o domínio oficial, mesmo no APK ou no preview. */
export const OFFICIAL_ORIGIN = "https://visitasc.com.br";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function inviteLink(_origin: string, token: string) { return `${OFFICIAL_ORIGIN}/c/${token}`; }

export function buildInviteText(ev: InviteEvent, part: InvitePart, all: InvitePart[], pin: string | null, origin: string): string {
  const lines: string[] = [];
  lines.push(`${ev.name}${ev.event_date ? ` — ${formatEventDate(ev.event_date)}` : ""}`);
  if (ev.location) lines.push(`Local: ${ev.location}`);
  if (part.speaker_name) lines.push(`Ancião: ${withCong(part.speaker_name, part.speaker_congregation)}`);
  const head = [part.outline_number ? `Parte Nº ${part.outline_number}` : part.part_type_label, part.part_time, part.duration_min ? `${part.duration_min} min` : null].filter(Boolean).join(" · ");
  lines.push(`Sua designação: ${head}`);
  if (part.theme) lines.push(`Tema: ${part.theme}`);
  const extras = partExtrasLabel(part);
  if (extras) lines.push(`Participações: ${extras}`);
  if (part.instructions) lines.push(`Informações para você: ${part.instructions}`);
  if (part.show_next_speaker) {
    const next = nextSpeakerName(all, part.id);
    if (next) lines.push(`Próximo orador: ${next}`);
  }
  if (ev.link_mode === "personal" && part.personal_token) {
    lines.push(`Confirme aqui: ${inviteLink(origin, part.personal_code || part.personal_token)}`);
  } else {
    lines.push(`Confirme aqui: ${inviteLink(origin, ev.public_code || ev.public_token)}`);
    if (pin) lines.push(`PIN: ${pin}`);
  }
  return lines.join("\n");
}
