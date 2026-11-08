// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { appConfirm, appPrompt } from "./app-dialogs";

afterEach(() => vi.restoreAllMocks());

describe("app dialogs fallback (no host mounted)", () => {
  it("confirm returns the user's answer", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(await appConfirm("Excluir?")).toBe(true);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(await appConfirm("Excluir?")).toBe(false);
  });
  it("prompt returns typed text, or null when cancelled", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Modelo 2");
    expect(await appPrompt("Novo modelo", "Modelo 1")).toBe("Modelo 2");
    vi.spyOn(window, "prompt").mockReturnValue(null);
    expect(await appPrompt("Novo modelo")).toBeNull();
  });
});
