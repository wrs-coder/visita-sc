// Tema (claro/escuro + preto puro opcional) — persistência local e aplicação
// imediata das classes `.dark` / `.oled` no <html>, sem flash entre renders.

const STORAGE_KEY = "visita-sc:theme:v1";
const OLED_KEY = "visita-sc:theme-oled:v1";

export type ThemeMode = "light" | "dark";

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();
const oledListeners = new Set<(on: boolean) => void>();

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function readStored(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function getTheme(): ThemeMode {
  return readStored() ?? (systemPrefersDark() ? "dark" : "light");
}

export function getOled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OLED_KEY) === "1";
  } catch {
    return false;
  }
}

function apply(mode: ThemeMode, oled = getOled()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("oled", mode === "dark" && oled);
  root.style.colorScheme = mode;
  const color = mode === "dark" ? (oled ? "#000000" : "#0b1020") : "#1e3a8a";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function setTheme(mode: ThemeMode, persist = true) {
  apply(mode);
  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota */
    }
  }
  listeners.forEach((l) => l(mode));
}

export function setOled(on: boolean) {
  try {
    window.localStorage.setItem(OLED_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  apply(getTheme(), on);
  oledListeners.forEach((l) => l(on));
}

export function subscribeOled(l: (on: boolean) => void): () => void {
  oledListeners.add(l);
  return () => oledListeners.delete(l);
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  apply(getTheme());
}
