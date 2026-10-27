import { describe, it, expect } from "vitest";
import { relTime } from "./GuestWorkspace";

describe("relTime", () => {
  const now = new Date("2026-10-27T12:00:00Z").getTime();
  it("mostra 'há 2 dias'", () => {
    expect(relTime("2026-10-25T12:00:00Z", "pt-BR", now)).toBe("anteontem");
    expect(relTime("2026-10-22T12:00:00Z", "pt-BR", now)).toBe("há 5 dias");
  });
});
