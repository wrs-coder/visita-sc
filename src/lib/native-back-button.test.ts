import { describe, it, expect } from "vitest";
import { decideBackAction } from "./native-back-button";

const base = { hasOpenLayer: false, canGoBack: true, isRoot: false, lastExitPressAt: null, now: 10_000 };

describe("decideBackAction", () => {
  it("fecha popup aberto antes de tudo", () => {
    expect(decideBackAction({ ...base, hasOpenLayer: true, isRoot: true })).toBe("close-layer");
  });
  it("volta à página anterior", () => {
    expect(decideBackAction(base)).toBe("history-back");
  });
  it("na tela inicial pede confirmação no primeiro toque", () => {
    expect(decideBackAction({ ...base, isRoot: true })).toBe("confirm-exit");
  });
  it("sai no segundo toque em até 2 s", () => {
    expect(decideBackAction({ ...base, isRoot: true, lastExitPressAt: 8_500 })).toBe("exit");
  });
  it("após 2 s volta a pedir confirmação", () => {
    expect(decideBackAction({ ...base, isRoot: true, lastExitPressAt: 7_000 })).toBe("confirm-exit");
  });
});
