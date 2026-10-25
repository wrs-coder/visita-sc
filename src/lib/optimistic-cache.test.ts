import { describe, expect, it } from "vitest";
import { applyToValue } from "./optimistic-cache";
import { isPermanentError, shouldQuarantine } from "./offline-queue";

describe("applyToValue", () => {
  it("aplica patch de update na linha certa", () => {
    const out = applyToValue([{ id: "a", n: 1 }, { id: "b", n: 1 }], { op: "update", match: { id: "b" }, payload: { n: 2 } });
    expect(out).toEqual([{ id: "a", n: 1 }, { id: "b", n: 2 }]);
  });
  it("remove a linha em delete", () => {
    expect(applyToValue([{ id: "a" }, { id: "b" }], { op: "delete", match: { id: "a" } })).toEqual([{ id: "b" }]);
  });
  it("não mexe quando o id não existe", () => {
    const v = [{ id: "a" }];
    expect(applyToValue(v, { op: "delete", match: { id: "z" } })).toBe(v);
  });
});

describe("Não enviados", () => {
  it("só move após 5 tentativas com erro do servidor", () => {
    const err = { code: "42501", message: "permission denied" };
    expect(shouldQuarantine(err, 4)).toBe(false);
    expect(shouldQuarantine(err, 5)).toBe(true);
  });
  it("falha de rede nunca vai para Não enviados", () => {
    expect(isPermanentError(new Error("timeout"))).toBe(false);
    expect(isPermanentError({ message: "Failed to fetch" })).toBe(false);
    expect(shouldQuarantine(new Error("timeout"), 50)).toBe(false);
  });
});
