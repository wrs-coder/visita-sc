import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { shouldWarnSessionExpired } from "./session-ready";

const base = { reason: "refresh-failed" as const, queued: 2, isGuest: false, online: true };

describe("aviso de sessão expirada", () => {
  it("avisa com alterações pendentes, conta própria e internet", () => {
    expect(shouldWarnSessionExpired(base)).toBe(true);
  });
  it("não avisa com fila vazia", () => {
    expect(shouldWarnSessionExpired({ ...base, queued: 0 })).toBe(false);
  });
  it("não avisa para acesso por código", () => {
    expect(shouldWarnSessionExpired({ ...base, reason: "no-session", isGuest: true })).toBe(false);
  });
  it("não avisa sem internet", () => {
    expect(shouldWarnSessionExpired({ ...base, online: false })).toBe(false);
  });
});
