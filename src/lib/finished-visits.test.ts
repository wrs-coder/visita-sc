// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { markVisitFinished, withoutFinished, readFinishedVisits } from "./finished-visits";

describe("finished visits", () => {
  beforeEach(() => localStorage.clear());
  it("visita confirmada não volta para a lista de Finalizar agora", () => {
    markVisitFinished("v1");
    expect(withoutFinished([{ id: "v1" }, { id: "v2" }])).toEqual([{ id: "v2" }]);
    expect(readFinishedVisits().has("v1")).toBe(true);
  });
});
