// Aviso diário de visitas próximas (≤ 60 dias) criadas sem nenhum modelo.
export const REMINDER_WINDOW_DAYS = 60;

export type VisitTemplateFields = {
  id: string;
  start_date: string;
  congregation_id: string;
  template_id?: string | null;
  checklist_template_id?: string | null;
  field_meeting_template_id?: string | null;
  meeting_talk_template_id?: string | null;
  elder_program_template_id?: string | null;
};

export function hasAnyTemplate(v: VisitTemplateFields): boolean {
  return !!(
    v.template_id ||
    v.checklist_template_id ||
    v.field_meeting_template_id ||
    v.meeting_talk_template_id ||
    v.elder_program_template_id
  );
}

export function localIsoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

/** Visitas que ainda não começaram, começam em até 60 dias e não têm modelo algum. */
export function pickVisitsNeedingTemplates<T extends VisitTemplateFields>(visits: T[], today: Date): T[] {
  const todayIso = localIsoDay(today);
  return visits
    .filter((v) => {
      if (!v.start_date || hasAnyTemplate(v)) return false;
      const d = daysBetween(todayIso, v.start_date);
      return d > 0 && d <= REMINDER_WINDOW_DAYS;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

const keyFor = (userId: string) => `visita-sc:visit-template-reminder:${userId}`;

export function alreadyShownToday(userId: string, today: Date): boolean {
  try { return localStorage.getItem(keyFor(userId)) === localIsoDay(today); } catch { return false; }
}

export function markShownToday(userId: string, today: Date): void {
  try { localStorage.setItem(keyFor(userId), localIsoDay(today)); } catch { /* quota */ }
}
