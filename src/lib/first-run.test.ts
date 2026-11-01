import { describe, expect, it, beforeEach } from "vitest";
import { afterSuperSignupRoute, finishFirstRun, isFirstRunPending } from "./first-run";

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(),
};

describe("first run", () => {
  beforeEach(() => localStorage.clear());
  it("new superintendent account opens Meu Perfil once", () => {
    expect(afterSuperSignupRoute()).toBe("/perfil");
    expect(isFirstRunPending()).toBe(true);
    finishFirstRun();
    expect(isFirstRunPending()).toBe(false);
  });
});
