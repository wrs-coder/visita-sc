import { describe, it, expect, vi, afterEach } from "vitest";
import { appConfirm, appPrompt } from "./app-dialogs";

const w = { confirm: vi.fn(), prompt: vi.fn() };
vi.stubGlobal("window", w);
afterEach(() => vi.clearAllMocks());

describe("app dialogs fallback (no host mounted)", () => {
  it("confirm returns the user's answer", async () => {
    w.confirm.mockReturnValue(true);
    expect(await appConfirm("Excluir?")).toBe(true);
    w.confirm.mockReturnValue(false);
    expect(await appConfirm("Excluir?")).toBe(false);
  });
  it("prompt returns typed text, or null when cancelled", async () => {
    w.prompt.mockReturnValue("Modelo 2");
    expect(await appPrompt("Novo modelo", "Modelo 1")).toBe("Modelo 2");
    w.prompt.mockReturnValue(null);
    expect(await appPrompt("Novo modelo")).toBeNull();
  });
});
