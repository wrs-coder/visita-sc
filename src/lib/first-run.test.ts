// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { afterSuperSignupRoute, finishFirstRun, isFirstRunPending } from "./first-run";

describe("first run", () => {
  beforeEach(() => localStorage.clear());
  it("new superintendent account opens Meu Perfil once", () => {
    expect(afterSuperSignupRoute()).toBe("/perfil");
    expect(isFirstRunPending()).toBe(true);
    finishFirstRun();
    expect(isFirstRunPending()).toBe(false);
  });
});
