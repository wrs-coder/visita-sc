import type { TimelineKind, TimelineSource } from "@/lib/today-timeline";
import { normalizeTime } from "@/lib/today-timeline";

export type ReminderRole = "superintendent" | "elder" | "wife";
export type ReminderPrefs = {
  enabled: boolean;
  lead: number;
  kinds: TimelineKind[];
  /** Antecedência própria por tipo (ausente = usa `lead`). */
  leadByKind?: Partial<Record<TimelineKind, number>>;
  /** Segundo aviso em minutos antes (0/ausente = desligado). */
  second?: number;
  /** Resumo do dia: um aviso no horário escolhido com a agenda do dia. */
  digest?: { on: boolean; time: string };
  /** Horário de silêncio: nenhum aviso cai dentro dessa faixa. */
  quiet?: { on: boolean; from: string; to: string };
  /** Lembrete diário de leitura bíblica (independe dos avisos de eventos). */
  reading?: Partial<Record<ReadingKind, ReadingReminder>>;
};
export type ReadingKind = "personal" | "family";
export type ReadingReminder = { on: boolean; time: string; days: number[] };
export type PlannedReminder = { id: number; at: Date; title: string; body: string; kind: TimelineKind | "digest" | "reading" };

export const ALL_KINDS: TimelineKind[] = ["schedule", "field", "study", "meal", "meeting", "transport"];
export const LEAD_OPTIONS = [15, 30, 60, 1440] as const;
export const SECOND_OPTIONS = [0, 15, 30, 60, 1440] as const;
export const MAX_REMINDERS = 60;
export const SNOOZE_MINUTES = 10;
export const SNOOZE_ACTION_TYPE = "visitasc-reminder";

/** Antecedência máxima: 8 semanas, em minutos. */
export const MAX_LEAD_MIN = 8 * 7 * 1440;
export const LEAD_UNITS = [["min", 1], ["h", 60], ["d", 1440], ["w", 10080]] as const;
export type LeadUnit = (typeof LEAD_UNITS)[number][0];
const validLead = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_LEAD_MIN;
/** Converte número + unidade em minutos (limitado a 1 min … 8 semanas). */
export function leadToMinutes(n: number, unit: LeadUnit): number {
  const f = LEAD_UNITS.find(([u]) => u === unit)?.[1] ?? 1;
  return Math.min(MAX_LEAD_MIN, Math.max(1, Math.round((Number.isFinite(n) ? n : 1) * f)));
}
/** Maior unidade que divide os minutos exatamente. */
export function splitLead(min: number): { n: number; unit: LeadUnit } {
  for (const [u, f] of [...LEAD_UNITS].reverse()) if (min >= f && min % f === 0) return { n: min / f, unit: u };
  return { n: min, unit: "min" };
}
export function leadLabel(min: number): string {
  const { n, unit } = splitLead(min);
  const names: Record<LeadUnit, [string, string]> = { min: ["min", "min"], h: ["hora", "horas"], d: ["dia", "dias"], w: ["semana", "semanas"] };
  return `${n} ${names[unit][n === 1 ? 0 : 1]}`;
}
const READING_KINDS: ReadingKind[] = ["personal", "family"];
const validReading = (r: unknown, fb: string): ReadingReminder => {
  const o = (r ?? {}) as Partial<ReadingReminder>;
  const days = Array.isArray(o.days) ? [...new Set(o.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [0, 1, 2, 3, 4, 5, 6];
  return { on: !!o.on, time: validTime(o.time, fb), days };
};
const validTime = (v: unknown, fb: string) => (typeof v === "string" && normalizeTime(v)) || fb;

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
      lead: validLead(p.lead) ? p.lead : 30,
      kinds: Array.isArray(p.kinds) ? p.kinds.filter((k) => allowed.includes(k)) : allowed,
      leadByKind: Object.fromEntries(
        Object.entries(p.leadByKind ?? {}).filter(([k, v]) => allowed.includes(k as TimelineKind) && validLead(v)),
      ),
      second: validLead(p.second) ? p.second : 0,
      digest: { on: !!p.digest?.on, time: validTime(p.digest?.time, "07:00") },
      quiet: { on: !!p.quiet?.on, from: validTime(p.quiet?.from, "22:00"), to: validTime(p.quiet?.to, "06:00") },
      reading: { personal: validReading(p.reading?.personal, "06:30"), family: validReading(p.reading?.family, "20:00") },
    };
  } catch {
    return defaultPrefs(role);
  }
}

export function savePrefs(scope: string, prefs: ReminderPrefs) {
  try {
    localStorage.setItem(key(scope), JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** true quando o horário cai no silêncio (aceita faixa que passa da meia-noite). */
export function inQuiet(at: Date, quiet: ReminderPrefs["quiet"]): boolean {
  if (!quiet?.on) return false;
  const t = at.getHours() * 60 + at.getMinutes();
  const a = toMin(quiet.from);
  const b = toMin(quiet.to);
  if (a === b) return false;
  return a < b ? t >= a && t < b : t >= a || t < b;
}

/** Converte eventos em lembretes futuros (pura, testável). */
export function planReminders(
  items: TimelineSource[],
  prefs: ReminderPrefs,
  role: ReminderRole,
  now: Date = new Date(),
  readToday: Partial<Record<ReadingKind, string | null>> = {},
): PlannedReminder[] {
  const reading = role === "elder" ? [] : planReadingReminders(prefs, now, readToday);
  if (!prefs.enabled) return reading;
  const allowed = kindsForRole(role);
  const out: PlannedReminder[] = [];
  const seen = new Set<string>();
  const days = new Map<string, string[]>();
  for (const it of items) {
    if (!allowed.includes(it.kind) || !prefs.kinds.includes(it.kind)) continue;
    const time = normalizeTime(it.time);
    if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(it.date ?? "")) continue;
    const [y, m, d] = it.date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const eventAt = new Date(y, m - 1, d, hh, mm);
    const uid = `${it.id}|${it.date}|${time}`;
    if (seen.has(uid)) continue;
    seen.add(uid);
    const first = prefs.leadByKind?.[it.kind] ?? prefs.lead;
    const leads = [first];
    if (prefs.second && prefs.second !== first) leads.push(prefs.second);
    leads.forEach((lead, i) => {
      const at = new Date(eventAt.getTime() - lead * 60_000);
      if (at.getTime() <= now.getTime() || inQuiet(at, prefs.quiet)) return;
      out.push({
        id: hashId(i === 0 ? uid : `${uid}|2`),
        at,
        kind: it.kind,
        title: `${it.title} às ${time}`,
        body: it.subtitle?.trim() || "Visita SC",
      });
    });
    if (prefs.digest?.on) {
      const list = days.get(it.date) ?? [];
      list.push(`${time} ${it.title}`);
      days.set(it.date, list);
    }
  }
  for (const [date, list] of days) {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = (prefs.digest?.time ?? "07:00").split(":").map(Number);
    const at = new Date(y, m - 1, d, hh, mm);
    if (at.getTime() <= now.getTime() || inQuiet(at, prefs.quiet)) continue;
    list.sort();
    out.push({
      id: hashId(`digest|${date}`),
      at,
      kind: "digest",
      title: `Hoje: ${list.length} ${list.length === 1 ? "compromisso" : "compromissos"}`,
      body: list.slice(0, 5).join(" · ") + (list.length > 5 ? " …" : ""),
    });
  }
  return [...reading, ...out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS - reading.length)]
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lembretes de leitura dos próximos 7 dias; pula hoje se a leitura já foi marcada. */
export function planReadingReminders(
  prefs: ReminderPrefs, now: Date = new Date(), readToday: Partial<Record<ReadingKind, string | null>> = {},
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const k of READING_KINDS) {
    const r = prefs.reading?.[k];
    if (!r?.on || !r.days.length) continue;
    const [hh, mm] = r.time.split(":").map(Number);
    for (let i = 0; i < 7; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm);
      if (!r.days.includes(at.getDay()) || at.getTime() <= now.getTime()) continue;
      if (i === 0 && readToday[k] === isoOf(now)) continue;
      out.push({
        id: hashId(`reading|${k}|${isoOf(at)}`), at, kind: "reading",
        title: k === "personal" ? "Hora da leitura pessoal" : "Hora da leitura em família",
        body: "Abra a Bíblia no Visita SC e marque o capítulo lido.",
      });
    }
  }
  return out;
}
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      androidBridge?: unknown;
    };
    if (w.Capacitor?.isNativePlatform?.() === true) return true;
    if (w.Capacitor?.getPlatform?.() && w.Capacitor.getPlatform() !== "web") return true;
    if (w.androidBridge) return true;
    if (typeof location !== "undefined" && (location.protocol === "capacitor:" || location.hostname === "localhost"))
      return true;
  } catch {
    /* noop */
  }
  return false;
}

async function plugin() {
  if (!isNative()) return null;
  try {
    const w =
      typeof window !== "undefined"
        ? (window as unknown as { Capacitor?: { Plugins?: { LocalNotifications?: any } } })
        : null;
    const globalLN = w?.Capacitor?.Plugins?.LocalNotifications;
    if (globalLN) return globalLN;

    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch (err) {
    console.warn("[reminders] Falha ao obter plugin:", err);
    return null;
  }
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

let snoozeReady = false;
/** Registra o botão "Adiar 10 min" e o tratamento do toque (uma vez por sessão). */
async function ensureSnooze(LN: any) {
  if (snoozeReady) return;
  snoozeReady = true;
  try {
    await LN.registerActionTypes({
      types: [{ id: SNOOZE_ACTION_TYPE, actions: [{ id: "snooze", title: `Adiar ${SNOOZE_MINUTES} min` }] }],
    });
    await LN.addListener("localNotificationActionPerformed", (ev: any) => {
      if (ev?.actionId !== "snooze") return;
      const n = ev.notification ?? {};
      void LN.schedule({
        notifications: [{
          id: (Date.now() % 1_000_000_000) + 1,
          title: n.extra?.title ?? n.title ?? "Visita SC",
          body: n.extra?.body ?? n.body ?? "",
          actionTypeId: SNOOZE_ACTION_TYPE,
          extra: n.extra,
          schedule: { at: new Date(Date.now() + SNOOZE_MINUTES * 60_000), allowWhileIdle: true },
        }],
      });
    });
  } catch (e) {
    console.warn("[reminders] snooze", e);
  }
}

/** Cancela os pendentes e agenda a lista nova (idempotente). */
export async function applyReminders(list: PlannedReminder[]): Promise<void> {
  const LN = await plugin().catch(() => null);
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    if (pending.notifications.length) {
      await LN.cancel({ notifications: pending.notifications.map((n: { id: number }) => ({ id: n.id })) });
    }
    if (!list.length) return;
    if ((await LN.checkPermissions()).display !== "granted") return;
    await ensureSnooze(LN);
    await LN.schedule({
      notifications: list.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        actionTypeId: SNOOZE_ACTION_TYPE,
        extra: { title: r.title, body: r.body },
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
    notifications: [
      { id: 1, title: "Visita SC", body: "Lembretes ativados ✓", schedule: { at: new Date(Date.now() + 3000) } },
    ],
  });
  return true;
}
