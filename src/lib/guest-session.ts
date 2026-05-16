import { startOfWeek, formatISO } from "date-fns";

const KEY_CODE = "guest_invite_code";
const KEY_WEEK = "guest_week_start"; // only set for ES (wife mode)

export function currentWeekStartISO(): string {
  return formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }), { representation: "date" });
}

export function isWifeCode(code: string): boolean {
  return code.trim().endsWith("*");
}

export function saveGuestSession(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CODE, code);
  if (isWifeCode(code)) {
    localStorage.setItem(KEY_WEEK, currentWeekStartISO());
  } else {
    localStorage.removeItem(KEY_WEEK);
  }
}

export function clearGuestSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_CODE);
  localStorage.removeItem(KEY_WEEK);
}

/** Returns valid code or null. Auto-clears ES sessions from previous weeks. */
export function readGuestSession(): string | null {
  if (typeof window === "undefined") return null;
  const code = localStorage.getItem(KEY_CODE);
  if (!code) return null;
  if (isWifeCode(code)) {
    const stored = localStorage.getItem(KEY_WEEK);
    if (stored !== currentWeekStartISO()) {
      clearGuestSession();
      return null;
    }
  }
  return code;
}
