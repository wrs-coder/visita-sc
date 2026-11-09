const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() };
import { beforeEach, describe, expect, it } from "vitest";
import { getScopedLibraryId, setScopedLibraryId } from "@/lib/bible-notes-store";

describe("Bíblia por aba", () => {
  beforeEach(() => localStorage.clear());
  it("esboços e leitura guardam escolhas separadas", () => {
    setScopedLibraryId("outlines", "pt-PT");
    setScopedLibraryId("reading", "pt-BR");
    expect(getScopedLibraryId("outlines")).toBe("pt-PT");
    expect(getScopedLibraryId("reading")).toBe("pt-BR");
  });
  it("'Igual à Bíblia em uso' apaga a escolha da aba", () => {
    setScopedLibraryId("reading", "pt-BR");
    setScopedLibraryId("reading", null);
    expect(getScopedLibraryId("reading")).toBeNull();
  });
});
