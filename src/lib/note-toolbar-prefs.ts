/**
 * Barra fixa do editor escolhida por cada usuário (só neste aparelho).
 * Guarda apenas uma lista de ids; ids desconhecidos são ignorados e uma
 * lista vazia/corrompida volta ao padrão. "Desfazer", "Aa" e "⋯" ficam
 * sempre na barra e não entram nesta lista.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_HIGHLIGHT, HIGHLIGHT_COLORS } from "./highlight-palette";

export const TOOLBAR_ITEM_IDS = [
  "redo",
  "bold",
  "italic",
  "underline",
  "highlight",
  "bulletList",
  "orderedList",
  "taskList",
  "outdent",
  "indent",
  "firstLine",
  "heading2",
  "heading3",
  "blockquote",
  "subscript",
  "superscript",
  "color",
  "alignLeft",
  "alignCenter",
  "alignRight",
  "alignJustify",
  "link",
  "table",
  "hr",
  "code",
  "codeBlock",
  "clearFormat",
  "topic",
  "convertHeadings",
  "photo",
  "video",
  "attachLink",
  "search",
  "focus",
] as const;

export type ToolbarItemId = (typeof TOOLBAR_ITEM_IDS)[number];

export const DEFAULT_TOOLBAR: ToolbarItemId[] = [
  "redo",
  "bold",
  "italic",
  "underline",
  "highlight",
  "bulletList",
  "outdent",
  "indent",
  "firstLine",
];

const KNOWN = new Set<string>(TOOLBAR_ITEM_IDS);
const PREFIX = "visita-sc:note-toolbar:";
const HL_KEY = "visita-sc:note-toolbar:last-highlight";

export function normalizeToolbar(raw: unknown): ToolbarItemId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_TOOLBAR];
  const seen = new Set<string>();
  const out: ToolbarItemId[] = [];
  for (const v of raw) {
    if (typeof v === "string" && KNOWN.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v as ToolbarItemId);
    }
  }
  return out.length ? out : [...DEFAULT_TOOLBAR];
}

const listeners = new Set<() => void>();
const cache = new Map<string, ToolbarItemId[]>();

export function readToolbar(scope: string): ToolbarItemId[] {
  const hit = cache.get(scope);
  if (hit) return hit;
  let v: ToolbarItemId[];
  try {
    const raw = localStorage.getItem(PREFIX + scope);
    v = normalizeToolbar(raw ? JSON.parse(raw) : null);
  } catch {
    v = [...DEFAULT_TOOLBAR];
  }
  cache.set(scope, v);
  return v;
}

export function saveToolbar(scope: string, ids: ToolbarItemId[] | null): void {
  const v = ids ? normalizeToolbar(ids) : [...DEFAULT_TOOLBAR];
  cache.set(scope, v);
  try {
    if (ids) localStorage.setItem(PREFIX + scope, JSON.stringify(v));
    else localStorage.removeItem(PREFIX + scope);
  } catch {
    /* sem espaço: vale só nesta sessão */
  }
  listeners.forEach((l) => l());
}

export function useToolbarItems(scope: string): ToolbarItemId[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => readToolbar(scope),
    () => DEFAULT_TOOLBAR,
  );
}

/** Última cor de marca-texto usada (botão rápido). */
export function readLastHighlight(): string {
  try {
    const v = localStorage.getItem(HL_KEY);
    if (v && (HIGHLIGHT_COLORS as readonly string[]).includes(v)) return v;
  } catch {
    /* */
  }
  return DEFAULT_HIGHLIGHT;
}

export function saveLastHighlight(color: string): void {
  try {
    if ((HIGHLIGHT_COLORS as readonly string[]).includes(color)) localStorage.setItem(HL_KEY, color);
  } catch {
    /* */
  }
}
