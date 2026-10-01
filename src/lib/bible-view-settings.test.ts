import { describe, it, expect, beforeEach } from "vitest";
import {
  applyHighlight, buildSegments, clampHeight, clampTextScale, neighborVerse,
  addHighlight, getHighlights, removeHighlightAt, loadSettings, saveSettings,
} from "./bible-view-settings";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

describe("bible view settings", () => {
  it("limita letra e altura", () => {
    expect(clampTextScale(5)).toBe(1.8);
    expect(clampTextScale(0.1)).toBe(0.8);
    expect(clampTextScale("x")).toBe(1);
    expect(clampHeight(50, 800)).toBe(120);
    expect(clampHeight(5000, 800)).toBe(640);
    expect(clampHeight(null, 800)).toBeNull();
  });

  it("lê preferências antigas com padrões", () => {
    store.set("bible:view-settings", JSON.stringify({ color: "sepia", bold: true }));
    expect(loadSettings()).toMatchObject({ color: "sepia", bold: true, textScale: 1, height: null, highlightColor: "yellow" });
    saveSettings({ textScale: 1.3 });
    expect(loadSettings().color).toBe("sepia");
  });

  it("mantém a última escala para qualquer balão aberto depois, sem alterar as outras preferências", () => {
    saveSettings({ color: "night_blue", height: 300, textScale: 1.4 });
    const nextPopover = loadSettings();
    expect(nextPopover.textScale).toBe(1.4);
    saveSettings({ textScale: clampTextScale(nextPopover.textScale + 0.1) });
    expect(loadSettings()).toMatchObject({ textScale: 1.5, color: "night_blue", height: 300 });
  });

  it("destaques antigos sem cor viram amarelo", () => {
    store.set("bible:highlights:v1", JSON.stringify({ k: [{ start: 0, end: 4 }] }));
    expect(getHighlights("k")).toEqual([{ start: 0, end: 4, color: "yellow" }]);
    const segs = buildSegments("abcdefgh", getHighlights("k"));
    expect(segs[0]).toMatchObject({ highlighted: true, color: "yellow" });
  });

  it("nova cor substitui o trecho de baixo e remoção funciona", () => {
    const r = applyHighlight([{ start: 0, end: 10 }], { start: 3, end: 6, color: "blue" });
    expect(r).toEqual([
      { start: 0, end: 3, color: "yellow" },
      { start: 3, end: 6, color: "blue" },
      { start: 6, end: 10, color: "yellow" },
    ]);
    addHighlight("v", { start: 0, end: 5, color: "green" });
    addHighlight("v", { start: 5, end: 8, color: "green" });
    expect(getHighlights("v")).toEqual([{ start: 0, end: 8, color: "green" }]);
    expect(removeHighlightAt("v", 2)).toEqual([]);
  });

  it("navegação de versículos para nos limites", () => {
    expect(neighborVerse([1, 2, 3], 2, 1)).toBe(3);
    expect(neighborVerse([1, 2, 3], 3, 1)).toBeNull();
    expect(neighborVerse([1, 2, 3], 1, -1)).toBeNull();
  });
});
