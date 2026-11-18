// Arquivo para partilhar semanas da reunião entre superintendentes (como os programas dos Grandes Eventos).
// Nunca leva nomes de oradores; quem importa recebe ids novos e o próprio dia/horário da reunião.
import { sanitizeProgram, type MeetingProgram } from "./meeting-store";

export const MEETING_SHARE_KIND = "visitasc-meeting-weeks";
export const MAX_MEETING_SHARE_BYTES = 1_000_000;

export function buildMeetingShareFile(list: MeetingProgram[]): string {
  return JSON.stringify({
    kind: MEETING_SHARE_KIND, version: 1, exportedAt: new Date().toISOString(),
    weeks: list.map((p) => ({ monday: p.monday, title: p.title, parts: p.parts.map((x) => { const c: Record<string, unknown> = { ...x }; delete c.assigned; return c; }) })),
  });
}

/** Dia (0=seg … 6=dom, relativo à segunda) e horário que a conta já usa; senão terça 19:30. */
export function usualSlot(existing: MeetingProgram[]): { offset: number; start: string } {
  const count = new Map<string, number>();
  for (const p of existing) {
    const off = Math.round((new Date(`${p.date}T00:00:00`).getTime() - new Date(`${p.monday}T00:00:00`).getTime()) / 86_400_000);
    if (off < 0 || off > 6) continue;
    const k = `${off}|${p.start}`; count.set(k, (count.get(k) ?? 0) + 1);
  }
  let best = "1|19:30", n = 0;
  for (const [k, c] of count) if (c > n) { best = k; n = c; }
  const [o, s] = best.split("|");
  return { offset: Number(o), start: s };
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function parseMeetingShareFile(text: string, existing: MeetingProgram[]): MeetingProgram[] {
  if (text.length > MAX_MEETING_SHARE_BYTES) throw new Error("Arquivo muito grande.");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("Este arquivo não é de semanas da reunião."); }
  const o = raw as { kind?: unknown; weeks?: unknown };
  if (!o || o.kind !== MEETING_SHARE_KIND || !Array.isArray(o.weeks)) throw new Error("Este arquivo não é de semanas da reunião.");
  const slot = usualSlot(existing);
  const out: MeetingProgram[] = [];
  for (const w of o.weeks.slice(0, 60)) {
    const wo = (w ?? {}) as Record<string, unknown>;
    const parts = Array.isArray(wo.parts) ? wo.parts.map((p) => ({ ...(p as object), id: crypto.randomUUID(), assigned: "" })) : [];
    const p = sanitizeProgram({ id: crypto.randomUUID(), monday: wo.monday, title: wo.title, parts, updatedAt: new Date().toISOString() });
    if (!p) continue;
    out.push({ ...p, date: addDays(p.monday, slot.offset), start: slot.start });
  }
  if (!out.length) throw new Error("Nenhuma semana válida no arquivo.");
  return out;
}
