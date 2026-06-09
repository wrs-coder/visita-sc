// Tema (claro/escuro) — persistência local e aplicação imediata da classe `.dark`
// no <html>. Sem dependência de framework para evitar flash entre renders.
// Side-effect import em __root.tsx garante que o tema seja aplicado antes
// da primeira pintura útil.

const STORAGE_KEY = "visita-sc:theme:v1";

export type ThemeMode = "light" | "dark";

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();

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

function apply(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = mode;
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

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Aplica imediatamente ao carregar o módulo no browser. Se o usuário ainda
// não escolheu, segue a preferência do sistema (sem persistir).
if (typeof window !== "undefined") {
  apply(getTheme());
}
