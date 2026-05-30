import { startOfWeek, formatISO } from "date-fns";

const KEY_CODE = "guest_invite_code";
const KEY_WEEK = "guest_week_start"; // only set for legacy "código*" wife sessions
const KEY_CONG = "guest_selected_congregation_id"; // only for super-wife code
const KEY_ANCHOR = "guest_week_anchor"; // null = current week (super-wife only)

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
  localStorage.removeItem(KEY_CONG);
  localStorage.removeItem(KEY_ANCHOR);
}

export type GuestSession = {
  code: string;
  congregationId: string | null;
  weekAnchor: string | null;
};

/**
 * Returns valid session or null. Auto-clears legacy "código*" sessions from
 * previous weeks. Super-wife sessions (no "*") and elder/ESC sessions are
 * persistent — they only clear on explicit logout.
 */
export function readGuestSession(): GuestSession | null {
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
  return {
    code,
    congregationId: localStorage.getItem(KEY_CONG),
    weekAnchor: localStorage.getItem(KEY_ANCHOR),
  };
}

export function setSelectedCongregation(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(KEY_CONG, id);
  else localStorage.removeItem(KEY_CONG);
}

export function setWeekAnchor(anchor: string | null) {
  if (typeof window === "undefined") return;
  if (anchor) localStorage.setItem(KEY_ANCHOR, anchor);
  else localStorage.removeItem(KEY_ANCHOR);
}
