import { describe, it, expect } from "vitest";
import { isMonthOpen } from "./open-months";

describe("isMonthOpen", () => {
  it("mês atual começa aberto e os outros fechados", () => {
    expect(isMonthOpen({}, "2027-03", "2027-03")).toBe(true);
    expect(isMonthOpen({}, "2027-04", "2027-03")).toBe(false);
  });
  it("a escolha salva vence o padrão", () => {
    expect(isMonthOpen({ "2027-03": false }, "2027-03", "2027-03")).toBe(false);
    expect(isMonthOpen({ "2027-04": true }, "2027-04", "2027-03")).toBe(true);
  });
});
