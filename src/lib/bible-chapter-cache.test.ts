import { describe, it, expect } from "vitest";
import { ChapterCache } from "./bible-chapter-cache";

describe("ChapterCache", () => {
  it("devolve capítulo guardado", () => {
    const c = new ChapterCache(3);
    c.set(ChapterCache.key("L", "B43", 3), [{ verse: 16 }]);
    expect(c.get("L:B43:3")).toEqual([{ verse: 16 }]);
  });
  it("descarta o mais antigo ao passar do limite", () => {
    const c = new ChapterCache(2);
    c.set("a", []); c.set("b", []); c.get("a"); c.set("c", []);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBeDefined();
    expect(c.size).toBe(2);
  });
  it("limpa só a Bíblia removida", () => {
    const c = new ChapterCache();
    c.set("L1:B1:1", []); c.set("L2:B1:1", []);
    c.clearLibrary("L1");
    expect(c.get("L1:B1:1")).toBeUndefined();
    expect(c.get("L2:B1:1")).toBeDefined();
  });
});
