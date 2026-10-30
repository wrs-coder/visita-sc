import { describe, expect, it } from "vitest";
import { isRealTap } from "./tap-guard";

const s = { x: 100, y: 100, t: 0, scroll: 0 };
describe("isRealTap", () => {
  it("toque curto e parado abre", () => expect(isRealTap(s, { x: 103, y: 104, t: 150, scroll: 0, hasSelection: false })).toBe(true));
  it("arrastar mais de 10px não abre", () => expect(isRealTap(s, { x: 100, y: 130, t: 150, scroll: 0, hasSelection: false })).toBe(false));
  it("página rolou não abre", () => expect(isRealTap(s, { x: 100, y: 100, t: 150, scroll: 40, hasSelection: false })).toBe(false));
  it("toque acima de 600ms sem seleção não abre", () => expect(isRealTap(s, { x: 100, y: 100, t: 700, scroll: 0, hasSelection: false })).toBe(false));
  it("seleção de trecho abre", () => expect(isRealTap(s, { x: 100, y: 160, t: 900, scroll: 0, hasSelection: true })).toBe(true));
});
