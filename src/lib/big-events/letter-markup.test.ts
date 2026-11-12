import { describe, expect, it } from "vitest";
import { bulletOf, parseRuns, stripMarkup, toggleBullets, toggleWrap } from "./letter-markup";

describe("marcação da carta", () => {
  it("texto sem marcação fica igual", () => {
    expect(parseRuns("Amado irmão: 2*3")).toEqual([{ text: "Amado irmão: 2*3", bold: false, italic: false, mark: false }]);
  });
  it("negrito, itálico e destaque", () => {
    const r = parseRuns("a **b** *c* ==d==");
    expect(r.filter((x) => x.bold).map((x) => x.text)).toEqual(["b"]);
    expect(r.filter((x) => x.italic).map((x) => x.text)).toEqual(["c"]);
    expect(r.filter((x) => x.mark).map((x) => x.text)).toEqual(["d"]);
    expect(stripMarkup("a **b** *c* ==d==")).toBe("a b c d");
  });
  it("marcador no início da linha", () => {
    expect(bulletOf("• Preparação")).toBe("Preparação");
    expect(bulletOf("Preparação")).toBeNull();
    expect(toggleBullets("um\ndois", 0, 7).value).toBe("• um\n• dois");
    expect(toggleBullets("• um\n• dois", 0, 9).value).toBe("um\ndois");
  });
  it("botão negrito envolve e desenvolve a seleção", () => {
    const a = toggleWrap("ola mundo", 4, 9, "**");
    expect(a.value).toBe("ola **mundo**");
    expect(toggleWrap(a.value, a.start, a.end, "**").value).toBe("ola mundo");
  });
});
