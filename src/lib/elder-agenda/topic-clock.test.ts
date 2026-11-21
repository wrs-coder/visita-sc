import { describe, expect, it } from "vitest";
import { emptyClock, next, prev, select, toggle, usedOf, resetCurrent } from "./topic-clock";
const ids = ["a", "b", "c"];
describe("tempo por tópico", () => {
  it("trocar de tópico não inicia a contagem", () => {
    const c = next(emptyClock(), ids, 0);
    expect(c.index).toBe(1); expect(c.running).toBe(false);
  });
  it("trocar de tópico não pausa a contagem", () => {
    let c = toggle(emptyClock(), ids, 0);
    c = next(c, ids, 10_000);
    expect(c.running).toBe(true); expect(c.index).toBe(1);
    expect(usedOf(c, ids, 0, 10_000)).toBe(10);
    expect(usedOf(c, ids, 1, 15_000)).toBe(5);
  });
  it("voltar retoma o tempo do tópico", () => {
    let c = toggle(emptyClock(), ids, 0);
    c = toggle(c, ids, 3_000); c = next(c, ids, 4_000); c = prev(c, ids, 5_000);
    expect(c.index).toBe(0); expect(usedOf(c, ids, 0, 9_000)).toBe(3);
  });
  it("não passa dos limites", () => {
    expect(prev(emptyClock(), ids, 0).index).toBe(0);
    expect(select(emptyClock(), ids, 9, 0).index).toBe(2);
  });
  it("zerar só o tópico atual", () => {
    let c = toggle(emptyClock(), ids, 0); c = next(c, ids, 2_000); c = resetCurrent(c, ids, 4_000);
    expect(usedOf(c, ids, 0, 4_000)).toBe(2); expect(usedOf(c, ids, 1, 4_000)).toBe(0);
  });
});
