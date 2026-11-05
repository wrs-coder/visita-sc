// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { textBetween } from "./epub-bible-parser";

describe("versículos de poesia do EPUB (palavras não colam)", () => {
  it("separa linhas em blocos e <br> com espaço", () => {
    const doc = new DOMParser().parseFromString(
      `<html><body><span id="v11">11</span><p class="l">Quem ama a pureza de coração</p><p class="l">e fala com graça</p>terá<br/>o rei como amigo.<span id="v12">12</span>x</body></html>`,
      "text/html",
    );
    const start = doc.getElementById("v11")!;
    const end = doc.getElementById("v12")!;
    const t = textBetween(doc, start, end);
    expect(t).toContain("coração e fala");
    expect(t).toContain("graça terá o rei");
  });
});
