import { describe, it, expect } from "vitest";
import { PERSIST_MAX_AGE } from "./query-persister";

describe("cópia local sem internet", () => {
  it("dura no mínimo 30 dias", () => {
    expect(PERSIST_MAX_AGE).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000);
  });
});
