import { describe, expect, it } from "vitest";
import { isVaultExpired, VAULT_MAX_AGE_MS } from "./offline-credentials";

describe("acesso sem internet (PIN) sem prazo", () => {
  it("não vence mesmo após 1 ano sem internet", () => {
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const meta = { userId: "u", label: "x", createdAt: yearAgo, lastOnlineAt: yearAgo, failedAttempts: 0, lockedUntil: 0, expiresAt: yearAgo + VAULT_MAX_AGE_MS, biometric: false };
    expect(isVaultExpired(meta as never)).toBe(false);
    expect(Number.isFinite(VAULT_MAX_AGE_MS)).toBe(false);
  });
});
