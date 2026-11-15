// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { firstLineFromElement, nextFirstLine } from "./first-line-indent";
import { htmlToDocxBody } from "./docx-export";

describe("recuo da 1ª linha", () => {
  it("lê text-indent positivo (1ª linha, 32px) e negativo (deslocado, 16px)", () => {
    expect(firstLineFromElement({ style: { textIndent: "32px" } })).toBe(1);
    expect(firstLineFromElement({ style: { textIndent: "64px" } })).toBe(2);
    expect(firstLineFromElement({ style: { textIndent: "400px" } })).toBe(4);
    expect(firstLineFromElement({ style: { textIndent: "-16px" } })).toBe(-1);
    expect(firstLineFromElement({ style: { textIndent: "-32px" } })).toBe(-2);
    expect(firstLineFromElement({ style: { textIndent: "-2px" } })).toBe(0);
    expect(firstLineFromElement({ style: { textIndent: "" } })).toBe(0);
  });
  it("ligar num parágrafo antigo com recuo de bloco troca o bloco pela 1ª linha", () => {
    expect(nextFirstLine({ indent: 1, firstLine: 0 }, true)).toEqual({ indent: 0, firstLine: 1 });
    expect(nextFirstLine({ indent: 0, firstLine: 0 }, true)).toEqual({ indent: 0, firstLine: 1 });
    expect(nextFirstLine({ indent: 2, firstLine: 1 }, false)).toEqual({ indent: 2, firstLine: 0 });
  });
  it("exporta para Word como w:firstLine (720 twips por degrau)", () => {
    const xml = htmlToDocxBody("", '<p style="text-indent: 32px">15 Algumas pessoas</p>');
    expect(xml).toContain('<w:ind w:firstLine="720"/>');
    const both = htmlToDocxBody("", '<p style="margin-left: 32px; text-indent: 32px">x</p>');
    expect(both).toContain('<w:ind w:left="720" w:firstLine="720"/>');
  });
});
