import { describe, it, expect } from "vitest";
import { snapFloat } from "./timer-float-prefs";
describe("snapFloat", () => {
  it("prende à borda esquerda quando solto na metade esquerda", () => {
    expect(snapFloat(10, 300, 120, 60, 400, 800).side).toBe("left");
  });
  it("prende à direita na metade direita", () => {
    expect(snapFloat(300, 300, 120, 60, 400, 800).side).toBe("right");
  });
  it("não deixa sair por baixo nem cobrir o topo", () => {
    expect(snapFloat(0, 5000, 120, 60, 400, 800).y).toBe(732);
    expect(snapFloat(0, -50, 120, 60, 400, 800, 100).y).toBe(108);
  });
});
