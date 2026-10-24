import type { TimelineKind, TimelineSource } from "@/lib/today-timeline";
import { normalizeTime } from "@/lib/today-timeline";

export type ReminderRole = "superintendent" | "elder" | "wife";
export type ReminderPrefs = { enabled: boolean; lead: number; kinds: TimelineKind[] };
export type PlannedReminder = { id: number; at: Date; title: string; body: string; kind: TimelineKind };

export const ALL_KINDS: TimelineKind[] = ["schedule", "field", "study", "meal", "meeting", "transport"];
export const LEAD_OPTIONS = [15, 30, 60, 1440] as const;
export const MAX_REMINDERS = 60;

/** Tipos disponíveis para cada perfil. */
export function kindsForRole(role: ReminderRole): TimelineKind[] {
  if (role === "elder") return ["meeting", "field"];
  if (role === "wife") return ["meal", "transport", "field", "schedule"];
  return ALL_KINDS;
}

export function defaultPrefs(role: ReminderRole): ReminderPrefs {
  return { enabled: false, lead: 30, kinds: kindsForRole(role) };
}

const key = (scope: string) => `visita-sc:reminders:${scope}`;

export function loadPrefs(scope: string, role: ReminderRole): ReminderPrefs {
  try {
    const raw = localStorage.getItem(key(scope));
    if (!raw) return defaultPrefs(role);
    const p = JSON.parse(raw) as Partial<ReminderPrefs>;
    const allowed = kindsForRole(role);
    return {
      enabled: !!p.enabled,
      lead: LEAD_OPTIONS.includes(p.lead as never) ? (p.lead as number) : 30,
      kinds: Array.isArray(p.kinds) ? p.kinds.filter((k) => allowed.includes(k)) : allowed,
    };
  } catch {
    return defaultPrefs(role);
  }
}

export function savePrefs(scope: string, prefs: ReminderPrefs) {
  try { localStorage.setItem(key(scope), JSON.stringify(prefs)); } catch { /* noop */ }
}

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
}

/** Converte eventos em lembretes futuros (pura, testável). */
export function planReminders(
  items: TimelineSource[],
  prefs: ReminderPrefs,
  role: ReminderRole,
  now: Date = new Date(),
): PlannedReminder[] {
  if (!prefs.enabled) return [];
  const allowed = kindsForRole(role);
  const out: PlannedReminder[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!allowed.includes(it.kind) || !prefs.kinds.includes(it.kind)) continue;
    const time = normalizeTime(it.time);
    if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(it.date ?? "")) continue;
    const [y, m, d] = it.date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const eventAt = new Date(y, m - 1, d, hh, mm);
    const at = new Date(eventAt.getTime() - prefs.lead * 60_000);
    if (at.getTime() <= now.getTime()) continue;
    const uid = `${it.id}|${it.date}|${time}`;
    if (seen.has(uid)) continue;
    seen.add(uid);
    out.push({
      id: hashId(uid),
      at,
      kind: it.kind,
      title: `${it.title} às ${time}`,
      body: it.subtitle?.trim() || "Visita SC",
    });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
}

async function plugin() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

export async function isRemindersSupported(): Promise<boolean> {
  return (await plugin().catch(() => null)) != null;
}

export async function requestReminderPermission(): Promise<boolean> {
  const LN = await plugin().catch(() => null);
  if (!LN) return false;
  const cur = await LN.checkPermissions();
  if (cur.display === "granted") return true;
  return (await LN.requestPermissions()).display === "granted";
}

/** Cancela os pendentes e agenda a lista nova (idempotente). */
export async function applyReminders(list: PlannedReminder[]): Promise<void> {
  const LN = await plugin().catch(() => null);
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    if (pending.notifications.length) {
      await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    if (!list.length) return;
    if ((await LN.checkPermissions()).display !== "granted") return;
    await LN.schedule({
      notifications: list.map((r) => ({
        id: r.id, title: r.title, body: r.body,
        schedule: { at: r.at, allowWhileIdle: true },
      })),
    });
  } catch (e) {
    console.warn("[reminders]", e);
  }
}

export async function sendTestReminder(): Promise<boolean> {
  const LN = await plugin().catch(() => null);
  if (!LN || !(await requestReminderPermission())) return false;
  await LN.schedule({
    notifications: [{ id: 1, title: "Visita SC", body: "Lembretes ativados ✓", schedule: { at: new Date(Date.now() + 3000) } }],
  });
  return true;
}
